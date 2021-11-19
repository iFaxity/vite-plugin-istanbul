import type { Plugin } from 'vite';
interface IstanbulPluginOptions {
    include?: string | string[];
    exclude?: string | string[];
    extension?: string | string[];
    requireEnv?: boolean;
    cypress?: boolean;
    checkProd?: boolean;
    cwd?: string;
}
declare global {
    var __coverage__: any;
}
declare function istanbulPlugin(opts?: IstanbulPluginOptions): Plugin;
export = istanbulPlugin;
//# sourceMappingURL=index.d.ts.map