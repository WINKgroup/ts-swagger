import { TsSwgMethod, TsSwgConfig, TsSwgSchemasData, TsSwgConfigServer } from "./_types";
import * as parser from "@babel/parser";
import * as t from '@babel/types';
declare class TsSwagger {
    readonly tsSwgConfig: TsSwgConfig;
    constructor(path: string);
    getAst(pathList: string[]): parser.ParseResult<t.File>;
    searchInterestingNodes(ast: parser.ParseResult<t.File>): t.TSInterfaceDeclaration[];
    scanExpressApi(ast: parser.ParseResult<t.File>): TsSwgMethod[];
    createApiJson: (methods: TsSwgMethod[]) => object;
    getDataForSchemas(nodes: t.TSInterfaceDeclaration[]): TsSwgSchemasData[];
    generateBasicJson(schemasData: TsSwgSchemasData[], apiName: string, version: string, description?: string): {
        openapi: string;
        info: {
            title: string;
            version: string;
            description: string | undefined;
            "x-comment": string;
        };
        paths: {};
        servers: TsSwgConfigServer[] | undefined;
    };
    checkConfig(tsSwgConfig: TsSwgConfig): void;
    getSwagger(fileName?: string): string;
    createJson(json: string, fileName: string): void;
}
export { TsSwagger };
