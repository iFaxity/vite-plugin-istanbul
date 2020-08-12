import type { Transform, Plugin } from 'vite';
import { transformSync } from '@babel/core';
import BabelPluginIstanbul from 'babel-plugin-istanbul';
import * as TestExclude from 'test-exclude';

interface IstanbulPluginOptions {
  include?: string|string[];
  exclude?: string|string[];
  extension?: string|string[];
}

function istanbulPlugin(opts: IstanbulPluginOptions = {}): Plugin {
  let exclude: TestExclude;
  const plugins = [ BabelPluginIstanbul ];
  const cwd = process.cwd();

  const transform: Transform = {
    test(ctx) {
      if (ctx.isBuild || process.env.NODE_ENV == 'production') {
        // do not transform for production builds
        return false;
      } else if (ctx.path.startsWith('/@modules/') || ctx.path.includes('node_modules')) {
        // do not transform if this is a dep
        return false;
      } else if (!exclude) {
        exclude = new TestExclude({
          cwd,
          include: opts.include,
          exclude: opts.exclude,
          extension: opts.extension,
          excludeNodeModules: true,
        });
      }

      return exclude.shouldInstrument(ctx.path);
    },
    transform(ctx) {
      const { code, map } = transformSync(ctx.code, {
        plugins, cwd,
        ast: false,
        sourceMaps: true,
        filename: ctx.path,
      });

      return { code, map };
    },
  };

  return { transforms: [ transform ] };
}

export = istanbulPlugin;
