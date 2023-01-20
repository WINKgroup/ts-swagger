export interface TsSwgMethod {
    name: string;
    path: string;
    interfaceName?: string;
    description?: string;
    responseDescription?: string;
    resStates?: { [key: string]: { description: string } };
    errorInterfaceName?: string;
    queryParameters: TsSwgQueryParameter[];
}

export interface TsSwgQueryParameter {
    name: string;
    type: string;
    description?: string;
}

export interface TsSwgSchemasData {
    interfaceName: string;
    variables: TsSwgVariable[];
}

export interface TsSwgVariable {
    name: string;
    type: string;
    optional: boolean | null;
    array: boolean;
    format?: string;
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
