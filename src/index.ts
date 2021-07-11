import type { Plugin, ServerHook, TransformResult } from 'vite';
import type { SourceMap, TransformHook, TransformPluginContext } from 'rollup';
import { transformAsync, TransformOptions } from '@babel/core';
import BabelPluginIstanbul from 'babel-plugin-istanbul';
import * as TestExclude from 'test-exclude';

interface IstanbulPluginOptions {
  include?: string|string[];
  exclude?: string|string[];
  extension?: string|string[];
  requireEnv?: boolean;
  cypress?: boolean;
  babelConfig?: TransformOptions;
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
  opts.babelConfig = opts.babelConfig || {}
  opts.babelConfig.plugins = opts.babelConfig.plugins || []
  opts.babelConfig.parserOpts = opts.babelConfig.parserOpts || {}

  const cwd = process.cwd();
  const babelConfig: TransformOptions = {
    ...opts.babelConfig,
    plugins: [...opts.babelConfig.plugins, [ BabelPluginIstanbul, opts ]], 
    cwd,
    filename: id,
    ast: false,
    sourceMaps: true,
    comments: true,
    compact: false,
    babelrc: false,
    configFile: false,
    parserOpts: {
      ...opts.babelConfig.parserOpts,
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
    if (process.env.NODE_ENV == 'production' || id.startsWith('/@modules/')) {
      // do not transform if this is a dep
      // do not transform for production builds
      return;
    }

    if (exclude.shouldInstrument(id)) {
      // if the vue component has already been transformed, 
      // it can be treated as a javascript file
      if (!id.endsWith('.vue') || srcCode.trim().slice(0, 1) !== "<") {
        return instrumentCode.call(this, srcCode, id, opts);
      }

      // Vue files are special, it requires a hack to fix the source mappings
      // We take the source code from within the <script> tag and instrument this
      // Then we pad the lines to get the correct line numbers for the mappings
      const openScriptTagObject = scriptRE.exec(srcCode);
      const endIndex = srcCode.indexOf('</script>');
      
      if (!openScriptTagObject || endIndex == -1) {
        // ignore this vue file, doesn't contain any javascript
        return;
      }
      
      const startIndex = openScriptTagObject.index
      const openScriptTag = openScriptTagObject[0]

      const numberOfLinesBeforeScript = srcCode.slice(0, endIndex).match(/\n/g)?.length ?? 0;
      const startOffset = openScriptTag.length;
      
      const scriptCode = '\n'.repeat(numberOfLinesBeforeScript) + srcCode.slice(startIndex + startOffset, endIndex);

      const res = await instrumentCode.call(this, scriptCode, id, opts);

      // if </script> is anywhere in the script block, even in a string, 
      // the parser errors
      const resCodeSanatized = res.code.replace(/<\/script>/g, "<\\/script>")
      
      res.code = `${srcCode.slice(0, startIndex + startOffset)}\n${resCodeSanatized}\n${srcCode.slice(endIndex)}`;
      return res;
    }
  };
}

function istanbulPlugin(opts: IstanbulPluginOptions = {}): Plugin {
  // Only instrument when we want to, as we only want instrumentation in test
  const env = opts.cypress ? process.env.CYPRESS_COVERAGE : process.env.VITE_COVERAGE;
  const requireEnv = opts.requireEnv ?? false;

  if (requireEnv && env?.toLowerCase() === 'false') {
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
