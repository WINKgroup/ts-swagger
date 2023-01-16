export interface TsSwgMethod {
    name: 'get' | 'put' | 'post' | 'delete';
    path: string;
    interfaceName?: string;
    description?: string;
    responseDescription?: string;
}

export interface TsSwgSchema {
    interfaceName: string;
    variables?: TsSwgVariable[];
}

export interface TsSwgVariable {
    name?: string;
    type?: string;
    optional?: boolean | null;
}

export interface TsSwgConfig {
    pathList: string[];
    apiName: string;
    version: string;
    description?: string;
    servers?: TsSwgConfigServer[];
}

export interface TsSwgConfigServer {
    url: string;
    description?: string;
}
