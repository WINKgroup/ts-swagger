import { TsSwgMethod, TsSwgConfig, TsSwgSchemaData, TsSwgVariable } from "./_types";
import _ from "lodash";
import * as fs from 'fs';
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as t from '@babel/types';
import { JSONFileError, JSONPathError, ApiPathError } from "./_errors";
import {
  getTypeScriptReader,
  getOpenApiWriter,
  makeConverter,
  ConversionResult
} from "typeconv";

class TsSwagger {
  readonly tsSwgConfig: TsSwgConfig;

  constructor(path: string) {
    try {
      this.tsSwgConfig = JSON.parse(fs.readFileSync(path).toString());
    } catch {
      throw new JSONPathError("Invalid JSON Path");
    }
  }

  getAst(pathList: string[]): parser.ParseResult<t.File> {
    const fileContents: string[] = [];

    pathList.forEach((path) => {
      const data = fs.readFileSync(path).toString();
      fileContents.push(data);
    });

    return parser.parse(fileContents.join(""), {
      sourceType: "module",
      plugins: ["typescript"],
    });
  }

  searchInterestingNodes(ast: parser.ParseResult<t.File>): t.TSInterfaceDeclaration[] {
    const nodes: t.TSInterfaceDeclaration[] = [];

    traverse(ast, {
      enter(path: any) {
        if (
          path.node.type === "TSInterfaceDeclaration" &&
          path.node.body.body[0].leadingComments?.some(
            (comment: any) =>
              comment.value.replace(/\s+/g, "").toLowerCase() === "swagger"
          )
        ) {
          nodes.push(path.node);
        }
      },
    });

    return nodes;
  }

  scanExpressApi(ast: parser.ParseResult<t.File>) {
    const methods: TsSwgMethod[] = [];

    const getCommentValue = (label: string, comment: string, spacing?: boolean) => {
      if (
        comment
          .replace(/\s+/g, "")
          .toLowerCase()
          .startsWith(label)
      ) {
        let value = spacing
          ? comment
          : comment.replace(/\s+/g, "");

        return value.replace(label, "");
      }
    }

    const getMethodInfo = (comment: string) => {
      const schema = getCommentValue("schema:", comment);
      const description = getCommentValue("description:", comment, true);
      const responseDescription = getCommentValue("response_description:", comment, true);

      return {
        ...schema ? { interfaceName: schema } : {},
        ...description ? { description } : {},
        ...responseDescription ? { responseDescription } : {}
      };
    }

    traverse(ast, {
      enter(path: any) {
        if (
          path.node.type === "ExpressionStatement" &&
          (path.node.expression.callee.property.name === "get" ||
            path.node.expression.callee.property.name === "post" ||
            path.node.expression.callee.property.name === "delete" ||
            path.node.expression.callee.property.name === "put")
        ) {
          let method: TsSwgMethod = {
            name: path.node.expression.callee.property.name,
            path: path.node.expression.arguments[0].value,
          };

          path.node.expression.arguments[1]?.body?.body[0]?.leadingComments?.forEach(
            (comment: any) => {
              _.merge(method, getMethodInfo(comment.value));
            }
          );

          path.node.expression.arguments[1]?.body?.innerComments?.forEach(
            (comment: any) => {
              _.merge(method, getMethodInfo(comment.value));
            }
          );

          if (method.interfaceName) methods.push(method);
        }
      },
    });

    return methods;
  }

  createApiJson = (methods: TsSwgMethod[]): object => {
    let json = {};

    methods.forEach((method) => {
      const { name, path, interfaceName, description, responseDescription } = method;

      const id = path.includes(":") &&
        path.substring(path.indexOf(':') + 1);
      const methodPath = id
        ? path.replace(`:${id}`, `{${id}}`)
        : path;

      const newJson = {
        [methodPath]: {
          [name]: {
            tags: [interfaceName],
            description: `${description ? description : ""}`,
            ...(id
              ? {
                parameters: [
                  {
                    name: `${id}`,
                    in: "path",
                    schema: {
                      type: "string",
                    },
                    required: true,
                    description: `The ${interfaceName} id`,
                  },
                ],
              }
              : {}),
            ...name === 'post' || name === 'put' ? {
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: {
                      $ref: `#/components/schemas/${interfaceName}`
                    }
                  }
                }
              }
            } : {},
            responses: {
              200: {
                description: `${responseDescription ? responseDescription : ""}`,
                content: {
                  "application/json": {
                    ...name === 'get' && !path.includes(':id') ? {
                      schema: {
                        type: `${name === "get" ? "array" : "object"}`,
                        items: {
                          $ref: `#/components/schemas/${interfaceName}`,
                        },
                      }
                    } : {
                      schema: {
                        $ref: `#/components/schemas/${interfaceName}`
                      }

                    },
                  },
                },
              },
            },
          },
        },
      };

      _.merge(json, newJson);
    });

    return json;
  };

  getDataForSchema(nodes: t.TSInterfaceDeclaration[]): TsSwgSchemaData[] {
    const schemaData: TsSwgSchemaData[] = [];

    const getVariableType = (type: string) => {
      switch (type) {
        case "TSBooleanKeyword":
          return "boolean"
        case "TSNumberKeyword":
          return "number"
        case "TSArrayType":
          return "array"
        case "TSObjectKeyword":
          return "object"
        case "TSStringKeyword":
        default:
          return "string"
      }
    }

    nodes.forEach(node => {
      const variables: TsSwgVariable[] = [];
      node.body.body.forEach(body => {
        if ("key" in body) {
          if ("name" in body.key) {
            let type = getVariableType(body.typeAnnotation?.typeAnnotation.type as string);
            let arrayType: string | undefined = undefined;
            if (type === 'array') {
              if (body.typeAnnotation?.typeAnnotation && "elementType" in body.typeAnnotation?.typeAnnotation)
                arrayType = getVariableType(body.typeAnnotation?.typeAnnotation.elementType.type);
            }

            variables.push(
              {
                name: body.key.name,
                optional: body.optional || false,
                type: arrayType ? arrayType : type,
                array: !!arrayType
              }
            )
          }
        }
      });

      schemaData.push({
        interfaceName: node.id.name,
        variables
      });
    })

    console.log(schemaData[0].variables);

    return schemaData;
  }

  nodesToTypescript(nodes: t.TSInterfaceDeclaration[]): string {
    return nodes
      .map((node) => `export ${generate(node).code}`)
      .join("\n");
  }

  typescriptToOpenApiJson(
    code: string,
    apiName: string,
    version: string
  ): Promise<ConversionResult<string>> {
    const reader = getTypeScriptReader();
    const writer = getOpenApiWriter({
      format: "json",
      title: apiName,
      version,
    });
    const { convert } = makeConverter(reader, writer);

    const convertData = async (code: string) => {
      return await convert({ data: code });
    };

    return convertData(code);
  }

  checkConfig(tsSwgConfig: TsSwgConfig) {
    const correctKeys = ['pathList', 'apiName', 'version'];

    for (const key in correctKeys) {
      if (!tsSwgConfig.hasOwnProperty(correctKeys[key]))
        throw new JSONFileError("Invalid JSON file");
    }

    for (const path in tsSwgConfig.pathList) {
      if (!fs.existsSync(tsSwgConfig.pathList[path]))
        throw new ApiPathError("Invalid API Path");
    }
  }

  async getSwagger(fileName?: string): Promise<string> {
    this.checkConfig(this.tsSwgConfig);

    const { pathList, apiName, version, description, servers } = this.tsSwgConfig;
    const ast = this.getAst(pathList);
    const nodes = this.searchInterestingNodes(ast);
    const methods = this.scanExpressApi(ast);
    const code = this.nodesToTypescript(nodes);
    const schema = await this.typescriptToOpenApiJson(code, apiName, version);
    const swagger = await JSON.parse(schema.data);
    swagger.info = {
      title: apiName,
      version,
      description,
      ["x-comment"]: "Generated by Ts-Swagger (https://github.com/WINKgroup/ts-to-openapi)"
    }
    swagger.servers = servers;
    swagger.paths = this.createApiJson(methods);

    const json = JSON.stringify(swagger, null, 2);
    if (fileName) {
      this.createJson(json, fileName);
    }

    return json;
  }

  createJson(json: string, fileName: string) {
    fs.writeFile(fileName, json, (err: NodeJS.ErrnoException | null) => {
      if (err) console.error(err.message);
    });
  }
}

module.exports = TsSwagger;

const tsswg = new TsSwagger("./src/config.json");
tsswg.getSwagger().then(result => console.log(""));