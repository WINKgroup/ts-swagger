import { TsSwgMethod, TsSwgConfig } from "./_types";
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
  makeConverter
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

  searchInterestingNodes(ast: parser.ParseResult<t.File>): t.Node[] {
    const nodes: t.Node[] = [];

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
              if (
                comment.value
                  .replace(/\s+/g, "")
                  .toLowerCase()
                  .startsWith("schema:")
              ) {
                const interfaceName = comment.value
                  .replace(/\s+/g, "")
                  .replace("schema:", "");
                method = { ...method, interfaceName };
              }
            }
          );

          path.node.expression.arguments[1]?.body?.innerComments?.forEach(
            (comment: any) => {
              if (
                comment.value
                  .replace(/\s+/g, "")
                  .toLowerCase()
                  .startsWith("schema:")
              ) {
                const interfaceName = comment.value
                  .replace(/\s+/g, "")
                  .replace("schema:", "");
                method = { ...method, interfaceName };
              }
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
      const id = method.path.includes(":") && 
        method.path.substring(method.path.indexOf(':') + 1);
      const methodPath = id 
        ? method.path.replace(`:${id}`, `{${id}}`) 
        : method.path;

      const newJson = {
        [methodPath]: {
          [method.name]: {
            tags: [method.interfaceName],
            description: "Insert method description",
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
                    description: `The ${method.interfaceName} id`,
                  },
                ],
              }
              : {}),
            ...method.name === 'post' || method.name === 'put' ? {
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: {
                      $ref: `#/components/schemas/${method.interfaceName}`
                    }
                  }
                }
              }
            } : {},
            responses: {
              200: {
                description: "Insert response description",
                content: {
                  "application/json": {
                    ...method.name === 'get' && !method.path.includes(':id') ? {
                      schema: {
                        type: `${method.name === "get" ? "array" : "object"}`,
                        items: {
                          $ref: `#/components/schemas/${method.interfaceName}`,
                        },
                      }
                    } : {
                      schema: {
                        $ref: `#/components/schemas/${method.interfaceName}`
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

  nodesToTypescript(nodes: t.Node[]): string {
    return nodes
      .map((node) => `export ${generate(node).code}`)
      .join("\n");
  }

  typescriptToOpenApiJson(
    code: string,
    apiName: string,
    version: string
  ): Promise<any> {
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

    for(const key in correctKeys){
      if(!tsSwgConfig.hasOwnProperty(correctKeys[key]))
        throw new JSONFileError("Invalid JSON file");
    }

    for(const path in tsSwgConfig.pathList){
      if(!fs.existsSync(tsSwgConfig.pathList[path]))
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