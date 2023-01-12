import { Method, SwgConfig } from "./_types";
import _ from "lodash";
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import {
  getTypeScriptReader,
  getOpenApiWriter,
  makeConverter
} from "typeconv";

const fs = require("fs");
const generate = require("@babel/generator");

class TypescriptToSwagger {
  getAst(pathList: string[]): any {
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

  searchInterestingNodes(ast: any): Node[] {
    const nodes: Node[] = [];

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

  scanExpressApi(ast: any) {
    const methods: Method[] = [];

    traverse(ast, {
      enter(path: any) {
        if (
          path.node.type === "ExpressionStatement" &&
          (path.node.expression.callee.property.name === "get" ||
            path.node.expression.callee.property.name === "post" ||
            path.node.expression.callee.property.name === "delete" ||
            path.node.expression.callee.property.name === "put")
        ) {
          let method: Method = {
            name: path.node.expression.callee.property.name,
            path: path.node.expression.arguments[0].value,
          };

          path.node.expression.arguments[1].body.body[0]?.leadingComments?.forEach(
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

          path.node.expression.arguments[1].body.innerComments?.forEach(
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

  createApiJson = (methods: Method[]): Object => {
    let json = {};
    methods.forEach((method) => {
      const methodPath = method.path.replace(":id", "{id}");

      const newJson = {
        [methodPath]: {
          [method.name]: {
            tags: [method.interfaceName],
            description: "Insert method description",
            ...(method.path.includes(":id")
              ? {
                parameters: [
                  {
                    name: "id",
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

  nodesToTypescript(nodes: Node[]): string {
    return nodes
      .map((node) => `export ${generate.default(node).code}`)
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

  async generateSwagger(config: SwgConfig): Promise<any> {
    const { pathList, apiName, version, description, servers } = config;
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

    return JSON.stringify(swagger);
  }

  createJson(json: Object, fileName: string) {
    fs.writeFile(fileName, json, (err: Error) => {
      if (err) console.error(err.message);
    });
  }
}

module.exports = TypescriptToSwagger;
