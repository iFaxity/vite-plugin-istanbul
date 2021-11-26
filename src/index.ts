import type { Plugin, ServerHook, TransformResult } from 'vite';
import type { TransformHook, TransformPluginContext, SourceMap } from 'rollup';
import { createInstrumenter } from 'istanbul-lib-instrument';
import TestExclude from 'test-exclude';

interface IstanbulPluginOptions {
  include?: string|string[];
  exclude?: string|string[];
  extension?: string|string[];
  requireEnv?: boolean;
  cypress?: boolean;
  checkProd?: boolean;
  cwd?: string;
}

// Required for typing to work in createConfigureServer()
declare global {
  var __coverage__: any;
}

// Custom extensions to include .vue files
const DEFAULT_EXTENSION = ['.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx', '.vue'];
const COVERAGE_PUBLIC_PATH = '/__coverage__';
const PLUGIN_NAME = 'vite:istanbul';

function sanitizeSourceMap(sourceMap: SourceMap): SourceMap {
  // JSON parse/stringify trick required for istanbul to accept the SourceMap
  return JSON.parse(JSON.stringify(sourceMap));
}

function createConfigureServer(): ServerHook {
  return ({ middlewares }) => {
    // Returns the current code coverage in the global scope
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

function createTransform(opts: IstanbulPluginOptions = {}): TransformHook {
  const exclude = new TestExclude({
    cwd: opts.cwd || process.cwd(),
    include: opts.include,
    exclude: opts.exclude,
    extension: opts.extension ?? DEFAULT_EXTENSION,
    excludeNodeModules: true,
  });
  const instrumenter = createInstrumenter({
    preserveComments: true,
    produceSourceMap: true,
    autoWrap: true,
    esModules: true,
  });

  return function (this: TransformPluginContext, srcCode: string, id: string): TransformResult | undefined {
    if (id.startsWith('/@modules/') || id.startsWith('\0')) {
      // do not transform if this is a dep
      return;
    }

    if (exclude.shouldInstrument(id)) {
      const sourceMap = sanitizeSourceMap(this.getCombinedSourcemap());
      const code = instrumenter.instrumentSync(srcCode, id, sourceMap);
      const map = instrumenter.lastSourceMap();

      // Required to cast to correct mapping value
      return { code, map } as TransformResult;
    }
  };
}

function istanbulPlugin(opts: IstanbulPluginOptions = {}): Plugin {
  // Only instrument when we want to, as we only want instrumentation in test
  // By default the plugin is always on
  const env = (opts.cypress ? process.env.CYPRESS_COVERAGE : process.env.VITE_COVERAGE);
  const envValue = env?.toLowerCase();
  const requireEnv = opts?.requireEnv ?? false;
  const prodCheck = opts?.checkProd ?? true;

  if (
    (prodCheck && process.env.NODE_ENV?.toLowerCase() === 'production') ||
    (!requireEnv && envValue === 'false') ||
    (requireEnv && envValue !== 'true')
  ) {
    return { name: PLUGIN_NAME };
  }

  return {
    name: PLUGIN_NAME,
    transform: createTransform(opts),
    configureServer: createConfigureServer(),
    config(config) {
      config.build = config.build || {}
      config.build.sourcemap = true // enforce sourcemapping
    },
    // istanbul only knows how to instrument JavaScript,
    // this allows us to wait until the whole code is JavaScript to
    // instrument and sourcemap
    enforce: 'post',
  };
}

export = istanbulPlugin;
