import {
  TsSwgMethod,
  TsSwgConfig,
  TsSwgSchemasData,
  TsSwgVariable,
  TsSwgConfigServer
} from "./_types";
import _ from "lodash";
import * as fs from 'fs';
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from '@babel/types';
import { JSONFileError, JSONPathError, ApiPathError } from "./_errors";
import {
  checkMethodName,
  getMethodInfo,
  getVariableType,
  isDate
} from "./utils";

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
              comment.value.includes("@tsswagger")
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
        if (path.container.comments) {
          const blockComments = path.container.comments;

          blockComments?.forEach((singleBlock: any) => {
            if (singleBlock.type === "CommentBlock") {
              const rows = singleBlock.value.split(/\r\n|\r|\n/);
              const method = getMethodInfo(rows);
              if (checkMethodName(method.name) && method.path && method.description)
                methods.push(method);
            }
          })
        }
      },
    });

    return methods;
  }

  createApiJson = (methods: TsSwgMethod[]): object => {
    let json = {};

    methods.forEach((method) => {
      const {
        name,
        path,
        interfaceName,
        description,
        responseDescription,
        resStates,
        errorInterfaceName,
        queryParameters
      } = method;

      const responseObj = _.cloneDeep(resStates);

      if (errorInterfaceName) {
        const content = {
          content: {
            "application/json": {
              schema: {
                $ref: `#/components/schemas/${errorInterfaceName}`
              }
            }
          }
        };
        let obj = {};
        for (const key in resStates) {
          obj = {
            ...obj,
            [key]: content
          }
        }
        _.merge(responseObj, obj);
      }

      const id = path.includes(":") &&
        path.substring(path.indexOf(':') + 1);
      const methodPath = id
        ? path.replace(`:${id}`, `{${id}}`)
        : path;

      const parameters = queryParameters.map(qp => {
        return {
          in: "query",
          name: qp.name,
          schema: {
            type: qp.type === "number" ? qp.type : "string"
          },
          description: qp.description
        }
      });

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
                  ...parameters
                ],
              }
              : { parameters }),
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
              ...responseObj ? responseObj : {},
              200: {
                description: `${responseDescription ? responseDescription : ""}`,
                content: {
                  "application/json": {
                    ...name === 'get' && !path.includes(':') ? {
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

  getDataForSchemas(nodes: t.TSInterfaceDeclaration[]): TsSwgSchemasData[] {
    const schemasData: TsSwgSchemasData[] = [];

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
                array: !!arrayType,
                ...isDate(body) ? { format: "date-time" } : {}
              }
            );

          }
        }
      });

      schemasData.push({
        interfaceName: node.id.name,
        variables
      });
    });

    return schemasData;
  }

  generateBasicJson(schemasData: TsSwgSchemasData[], apiName: string, version: string, description?: string) {
    let json = {
      openapi: "3.0.0",
      info: {
        title: apiName,
        version,
        description,
        ["x-comment"]: "Generated by Ts-Swagger (https://github.com/WINKgroup/ts-swagger). Powered by WiNK."
      },
      paths: {},
      servers: [] as TsSwgConfigServer[] | undefined
    };

    schemasData.forEach(model => {
      const required: string[] = [];
      const interfaceName = model.interfaceName;
      let properties = {};

      model.variables?.forEach(variable => {
        variable.optional === false && variable.name && required.push(variable.name);
        if (variable.array) {
          properties = {
            ...properties,
            ...variable.name ? {
              [variable.name]: {
                items: {
                  title: `${interfaceName}.${variable.name}.[]`,
                  type: variable.type,
                  format: variable.format
                },
                title: `${interfaceName}.${variable.name}`,
                type: "array"
              }
            } : {}
          }
        } else {
          properties = {
            ...properties,
            ...variable.name ? {
              [variable.name]: {
                title: `${interfaceName}.${variable.name}`,
                type: variable.type,
                format: variable.format
              }
            } : {}
          }
        }
      });

      const newJson = {
        components: {
          schemas: {
            [interfaceName]: {
              properties,
              required,
              additionalProperties: false,
              title: interfaceName,
              type: "object",
            }
          }
        }
      };

      _.merge(json, newJson);
    });

    return json;

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

  getSwagger(fileName?: string): string {
    this.checkConfig(this.tsSwgConfig);

    const { pathList, apiName, version, description, servers } = this.tsSwgConfig;
    const ast = this.getAst(pathList);
    const nodes = this.searchInterestingNodes(ast);
    const methods = this.scanExpressApi(ast);
    const schemasData = this.getDataForSchemas(nodes);
    const swagger = this.generateBasicJson(schemasData, apiName, version, description);
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

export { TsSwagger }
