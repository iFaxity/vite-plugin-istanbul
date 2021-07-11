import type { Plugin, ServerHook, TransformResult } from 'vite';
import type { TransformHook, TransformPluginContext } from 'rollup';
import { transformAsync, TransformOptions } from '@babel/core';
import BabelPluginIstanbul from 'babel-plugin-istanbul';
import TestExclude from 'test-exclude';

interface IstanbulPluginOptions {
  include?: string|string[];
  exclude?: string|string[];
  extension?: string|string[];
  requireEnv?: boolean;
  cypress?: boolean;
}

declare global {
  var __coverage__: any;
}

const COVERAGE_PUBLIC_PATH = '/__coverage__';

function createConfigureServer(): ServerHook {
  return ({ middlewares }) => {
    // Return global code coverage (will probably be null).
    middlewares.use((req, res, next) => {
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

async function instrumentCode(this: TransformPluginContext, srcCode: string, id: string, opts: IstanbulPluginOptions): Promise<TransformResult> {

  const cwd = process.cwd();
  const babelConfig: TransformOptions = {
    plugins: [[ BabelPluginIstanbul, opts ]], 
    cwd,
    filename: id,
    ast: false,
    sourceMaps: true,
    comments: true,
    compact: false,
    babelrc: false,
    configFile: false,
    parserOpts: {
      allowReturnOutsideFunction: true,
      sourceType: 'module',
    },
    // Only keep primitive properties
    inputSourceMap: JSON.parse(JSON.stringify(this.getCombinedSourcemap())),
  }

  const { code, map } = (await transformAsync(srcCode, babelConfig))!

  // Required to cast to correct mapping value
  return { code, map } as TransformResult;
}

const scriptRE = /<script([^>]*)>/g

function createTransform(opts: IstanbulPluginOptions = {}): TransformHook {
  const exclude = new TestExclude({
    cwd: process.cwd(),
    include: opts.include,
    exclude: opts.exclude,
    extension: opts.extension,
    excludeNodeModules: true,
  });

  return async function (this: TransformPluginContext, srcCode: string, id: string): Promise<undefined | TransformResult>{
    if (id.startsWith('/@modules/')) {
      // do not transform if this is a dep
      return;
    }

    if (exclude.shouldInstrument(id)) {
      return instrumentCode.call(this, srcCode, id, opts);
    }
  };
}

function istanbulPlugin(opts: IstanbulPluginOptions = {}): Plugin {
  // Only instrument when we want to, as we only want instrumentation in test
  const env = opts.cypress ? process.env.CYPRESS_COVERAGE : process.env.VITE_COVERAGE;
  const requireEnv = opts.requireEnv ?? false;

  if (process.env.NODE_ENV == 'production' && requireEnv && env?.toLowerCase() === 'false') {
    return { name: 'vite:istanbul' };
  }

  return {
    name: 'vite:istanbul',
    transform: createTransform(opts),
    configureServer: createConfigureServer(),
    enforce: 'post'
  };
}

export = istanbulPlugin;
