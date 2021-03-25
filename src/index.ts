import type { Plugin, ServerHook, TransformResult } from 'vite';
import type { TransformHook, TransformPluginContext } from 'rollup';
import { transformSync } from '@babel/core';
import BabelPluginIstanbul from 'babel-plugin-istanbul';
import * as TestExclude from 'test-exclude';

interface IstanbulPluginOptions {
  include?: string|string[];
  exclude?: string|string[];
  extension?: string|string[];
  flipEnv?: boolean;
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

function transformCode(this: TransformPluginContext, srcCode: string, id: string, opts: IstanbulPluginOptions): TransformResult {
  const plugins = [ BabelPluginIstanbul, opts ];
  const cwd = process.cwd();

  const { code, map } = transformSync(srcCode, {
    plugins, cwd,
    filename: id,
    ast: false,
    sourceMaps: true,
    comments: true,
    compact: true,
    parserOpts: {
      allowReturnOutsideFunction: true,
      sourceType: 'module',
    },
    // Only keep primitive properties
    inputSourceMap: JSON.parse(JSON.stringify(this.getCombinedSourcemap())),
  });

  // Required to cast to correct mapping value
  return { code, map: JSON.parse(JSON.stringify(map)) };
}

function createTransform(opts: IstanbulPluginOptions = {}): TransformHook {
  const exclude = new TestExclude({
    cwd: process.cwd(),
    include: opts.include,
    exclude: opts.exclude,
    extension: opts.extension,
    excludeNodeModules: true,
  });

  return function (srcCode: string, id: string) {
    if (process.env.NODE_ENV == 'production' || id.startsWith('/@modules/')) {
      // do not transform if this is a dep
      // do not transform for production builds
      return;
    }

    if (exclude.shouldInstrument(id)) {
      if (!id.endsWith('.vue')) {
        return transformCode.call(this, srcCode, id, opts);
      }

      // Vue files are special, it requires a hack to fix the source mappings
      // We take the source code from within the <script> tag and instrument this
      // Then we pad the lines to get the correct line numbers for the mappings
      let startIndex = srcCode.indexOf('<script>');
      const endIndex = srcCode.indexOf('</script>');

      if (startIndex == -1 || endIndex == -1) {
        // ignore this vue file, doesn't contain any javascript
        return;
      }

      const lines = srcCode.slice(0, endIndex).match(/\n/g)?.length ?? 0;
      const startOffset = '<script>'.length;

      srcCode = '\n'.repeat(lines) + srcCode.slice(startIndex + startOffset, endIndex);

      const res = transformCode.call(this, srcCode, id, opts);

      res.code = `${srcCode.slice(0, startIndex + startOffset)}\n${res.code}\n${srcCode.slice(endIndex)}`;
      return res;
    }
  };
}

function istanbulPlugin(opts?: IstanbulPluginOptions): Plugin {
  // Only instrument when we want to, as we only want instrumentation in test
  const env = opts.cypress ? process.env.CYPRESS_COVERAGE : process.env.VITE_COVERAGE;
  const envValue = opts.flipEnv ? 'true' : 'false';
  const shouldInstrument = env.toLowerCase() || envValue;

  if (shouldInstrument == envValue) {
    return { name: 'vite:istanbul' };
  }

  return {
    name: 'vite:istanbul',
    transform: createTransform(opts),
    configureServer: createConfigureServer(),
  };
}

export = istanbulPlugin;
