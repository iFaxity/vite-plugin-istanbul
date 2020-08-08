import type { Plugin } from 'vite';
interface IstanbulPluginOptions {
    include?: RegExp | RegExp[];
    exclude?: RegExp | RegExp[];
    extension?: string[];
}
declare function istanbulPlugin(opts?: IstanbulPluginOptions): Plugin;
export = istanbulPlugin;
//# sourceMappingURL=index.d.ts.map