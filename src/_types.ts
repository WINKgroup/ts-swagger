export interface Method {
    name: 'get' | 'put' | 'post' | 'delete';
    path: string;
    interfaceName?: string;
}
