export interface Method {
    name: 'get' | 'put' | 'post' | 'delete';
    path: string;
    interfaceName?: string;
}

export interface SwaggerConfig {
    interfaceUrls: string[];
    apiUrls: string[];
    apiName: string;
    version: string;
}
