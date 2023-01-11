import { Method } from "./_types";

const fs = require("fs");
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator");
const { getTypeScriptReader, getOpenApiWriter, makeConverter } = require('typeconv');

class TypescriptToSwagger {
    getAst(url: string): any {
        const fileContents = fs.readFileSync(url).toString();
        return parse(fileContents, { sourceType: 'module', plugins: ["typescript"] });
    }

    searchInterestingNodes(ast: any): Node[] {
        const nodes: Node[] = [];

        traverse(ast, {
            enter(path: any) {
                if (
                    path.node.type === 'TSInterfaceDeclaration' &&
                    path.node.body.body[0].leadingComments?.some((comment: any) => comment.value.replace(/\s+/g, '').toLowerCase() === 'swagger')
                ) {
                    nodes.push(path.node);
                }
            }
        },
        );

        return nodes;
    }

    scanExpressApi(ast: any) {
        const methods: Method[] = [];

        traverse(ast, {
            enter(path: any) {
                if (path.node.type === 'ExpressionStatement' && (
                    path.node.expression.callee.property.name === 'get' ||
                    path.node.expression.callee.property.name === 'post' ||
                    path.node.expression.callee.property.name === 'delete' ||
                    path.node.expression.callee.property.name === 'put'
                )) {
                    let method: Method = {
                        name: path.node.expression.callee.property.name,
                        path: path.node.expression.arguments[0].quasis[0].value.raw
                    };

                    path.node.expression.arguments[1].body.body[0]?.leadingComments?.forEach((comment: any) => {
                        if (comment.value.replace(/\s+/g, '').toLowerCase().startsWith('schema:')) {
                            const interfaceName = comment.value.replace(/\s+/g, '').replace('schema:', '');
                            method = { ...method, interfaceName };
                        }
                    });

                    path.node.expression.arguments[1].body.innerComments?.forEach((comment: any) => {
                        if (comment.value.replace(/\s+/g, '').toLowerCase().startsWith('schema:')) {
                            const interfaceName = comment.value.replace(/\s+/g, '').replace('schema:', '');
                            method = { ...method, interfaceName };
                        }
                    });

                    methods.push(method);
                }
            }
        },
        );

        return methods;
    }

    nodesToTypescript(nodes: Node[]): string {
        return nodes.map(node => `export ${generate.default(node).code}`).join('\n');
    }

    typescriptToOpenApiJson(code: string, apiName: string, version: string): Promise<any> {
        const reader = getTypeScriptReader();
        const writer = getOpenApiWriter({ format: 'json', title: apiName, version });
        const { convert } = makeConverter(reader, writer);

        const convertData = async (code: string) => {
            return await convert({ data: code });
        }

        return convertData(code);

    }

    generateSwagger(url: string, apiName: string, version: string): Promise<any> {
        const ast = this.getAst(url);
        const nodes = this.searchInterestingNodes(ast);
        const code = this.nodesToTypescript(nodes);
        return this.typescriptToOpenApiJson(code, apiName, version);
    }

    createJson(json: Object, fileName: string) {
        fs.writeFile(fileName, json, (err: Error) => {
            if (err)
                console.error(err.message);
        })
    }
}

module.exports = TypescriptToSwagger;