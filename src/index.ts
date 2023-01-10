const fs = require('fs');
const generator = require('@babel/generator');
const { parse } = require("@babel/parser");
const { getTypeScriptReader, getOpenApiWriter, makeConverter } = require('typeconv');
const traverse = require('@babel/traverse').default;
class TypescriptToSwagger {
    getAst(url: string): any {
        const fileContents = fs.readFileSync(url).toString();
        return parse(fileContents, { sourceType: 'module', plugins: ["typescript"] });
    }

    searchInterestingNodes(ast: any, keyword: string, nodeType: string): Node[] {
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
        return nodes.map(node => `export ${generator.default(node).code}`).join('\n');
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
        const nodes = this.searchInterestingNodes(ast, 'swagger', 'TSInterfaceDeclaration');
        const code = this.nodesToTypescript(nodes);
        return this.typescriptToOpenApiJson(code, apiName, version);
    }
    
    createJson(json: Object, fileName: string) {
        const convertedJson = JSON.stringify(json);
        fs.writeFile(fileName, convertedJson, (err: Error) => {
            if(err)
                console.error(err.message);
        })
    }
}

const json = new TypescriptToSwagger();
const swagger = json.generateSwagger('test/test.ts', 'Person API', 'v1').then(result => console.log(result));

// json.createJson({
//     prova: 'ciao',
//     id: 5
// }, 'swagger.json');

