class TypescriptToSwagger {

    getAst(url: string): any {
        const fs = require('fs');
        const { parse } = require("@babel/parser");
        const fileContents = fs.readFileSync(url).toString();

        return parse(fileContents, { sourceType: 'module', plugins: ["typescript"] });
    }

    searchInterestingNodes(ast: any, keyword: string, nodeType: string): Node[] {
        const traverse = require('@babel/traverse').default;
        const nodes: Node[] = [];

        traverse(ast, {
            enter(path: any) {
                if (
                    path.node.type === nodeType &&
                    path.node.body.body[0].leadingComments?.some((comment: any) => comment.value.replace(/\s+/g, '').toLowerCase() === keyword)
                ) {
                    nodes.push(path.node);
                }
            }
        },
        );

        return nodes;
    }

    nodesToTypescript(nodes: Node[]): string {
        const generator = require('@babel/generator');
        return nodes.map(node => `export ${generator.default(node).code}`).join('\n');
    }

    typescriptToOpenApiJson(code: string, apiName: string, version: string): Promise<any> {
        const { getTypeScriptReader, getOpenApiWriter, makeConverter } = require('typeconv');
        const reader = getTypeScriptReader();
        const writer = getOpenApiWriter({ format: 'json', title: apiName, version });
        const { convert } = makeConverter(reader, writer);

        const convertData = async (code: string) => {
            return await convert({ data: code });
        }

        return convertData(code);

    }

    // return promise
    generateSwagger(url: string, apiName: string, version: string): Promise<any> {
        const ast = this.getAst(url);
        const nodes = this.searchInterestingNodes(ast, 'swagger', 'TSInterfaceDeclaration');
        const code = this.nodesToTypescript(nodes);
        return this.typescriptToOpenApiJson(code, apiName, version);
    }


}
