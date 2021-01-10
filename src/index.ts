import type { Plugin, ServerHook } from 'vite';
import type { TransformHook } from 'rollup';
import { transformSync } from '@babel/core';
import BabelPluginIstanbul from 'babel-plugin-istanbul';
import * as TestExclude from 'test-exclude';

interface IstanbulPluginOptions {
  include?: string|string[];
  exclude?: string|string[];
  extension?: string|string[];
}

declare global {
  var __coverage__: any;
}

const COVERAGE_PUBLIC_PATH = '/__coverage__';

function createConfigureServer(): ServerHook {
  return ({ app }) => {
    // Return global code coverage (will probably be null).
    app.use((req, res, next) => {
      if (req.url !== COVERAGE_PUBLIC_PATH) {
        return next();
      }

      const coverage = (global.__coverage__) ?? null;
      let data: string;

      try {
        data = JSON.stringify(coverage, null, 4);
      } catch (ex) {
        return next(ex);
      }

      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(data);
    });
  };
}

function createTransform(opts: IstanbulPluginOptions = {}): TransformHook {
  const plugins = [ BabelPluginIstanbul ];
  const cwd = process.cwd();
  const exclude = new TestExclude({
    cwd,
    include: opts.include,
    exclude: opts.exclude,
    extension: opts.extension,
    excludeNodeModules: true,
  });

  return function (srcCode, id) {
    if (process.env.NODE_ENV == 'production' || id.startsWith('/@modules/')) {
      // do not transform if this is a dep
      // do not transform for production builds
      return;
    }

    if (exclude.shouldInstrument(id)) {
      const { code, map } = transformSync(srcCode, {
        plugins, cwd,
        filename: id,
        ast: false,
        sourceMaps: true,
        inputSourceMap: this.getCombinedSourcemap(),
      });
      return { code, map };
    }
  };
}

function istanbulPlugin(opts?: IstanbulPluginOptions): Plugin {
  return {
    name: 'vite:istanbul',
    transform: createTransform(opts),
    configureServer: createConfigureServer(),
  };
}

export = istanbulPlugin;
