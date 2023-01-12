export interface Method {
    name: 'get' | 'put' | 'post' | 'delete';
    path: string;
    interfaceName?: string;
}

export interface SwgConfig {
    pathList: string[];
    apiName: string;
    version: string;
    description?: string;
    servers?: SwgConfigServer[];
}

export interface SwgConfigServer {
    url: string;
    description?: string;
}
