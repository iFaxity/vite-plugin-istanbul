import type { Plugin } from 'vite';
import { IstanbulPluginOptions, createTransform } from './transform';
import { serverPlugin } from './server';

function istanbulPlugin(opts?: IstanbulPluginOptions): Plugin {
  const transform = createTransform(opts);

  return {
    transforms: [ transform ],
    configureServer: serverPlugin,
  };
}


export = istanbulPlugin;
