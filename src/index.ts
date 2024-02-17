import { loadNycConfig } from '@istanbuljs/load-nyc-config';
import { createInstrumenter } from 'istanbul-lib-instrument';
import picocolors from 'picocolors';
import type { ExistingRawSourceMap } from 'rollup';
import TestExclude from 'test-exclude';
import { Plugin, TransformResult, createLogger } from 'vite';
import { createIdentitySourceMap } from './source-map';

const { yellow } = picocolors;

// Required for typings to work in configureServer()
declare global {
  var __coverage__: any;
}

export interface IstanbulPluginOptions {
  include?: string | string[];
  exclude?: string | string[];
  extension?: string | string[];
  requireEnv?: boolean;
  cypress?: boolean;
  checkProd?: boolean;
  forceBuildInstrument?: boolean;
  cwd?: string;
  nycrcPath?: string;
}

// Custom extensions to include .vue files
const DEFAULT_EXTENSION = ['.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx', '.vue'];
const COVERAGE_PUBLIC_PATH = '/__coverage__';
const PLUGIN_NAME = 'vite:istanbul';
const MODULE_PREFIX = '/@modules/';
const NULL_STRING = '\0';

function sanitizeSourceMap(rawSourceMap: ExistingRawSourceMap): ExistingRawSourceMap {
  // Delete sourcesContent since it is optional and if it contains process.env.NODE_ENV vite will break when trying to replace it
  const { sourcesContent, ...sourceMap } = rawSourceMap;

  // JSON parse/stringify trick required for istanbul to accept the SourceMap
  return JSON.parse(JSON.stringify(sourceMap));
}

function getEnvVariable(key: string, prefix: string | string[], env: Record<string, any>): string {
  if (Array.isArray(prefix)) {
    const envPrefix = prefix.find((pre) => {
      const prefixedName = `${pre}${key}`;

      return env[prefixedName] != null;
    });

    prefix = envPrefix ?? '';
  }

  return env[`${prefix}${key}`];
}

async function createTestExclude(opts: IstanbulPluginOptions): Promise<TestExclude> {
  const { nycrcPath, include, exclude, extension } = opts;
  const cwd = opts.cwd ?? process.cwd();

  const nycConfig = await loadNycConfig({
    cwd,
    nycrcPath,
  });

  // Only instrument when we want to, as we only want instrumentation in test
  // By default the plugin is always on
  return new TestExclude({
    cwd,
    include: include ?? nycConfig.include,
    exclude: exclude ?? nycConfig.exclude,
    extension: extension ?? nycConfig.extension ?? DEFAULT_EXTENSION,
    excludeNodeModules: true,
  });
}

function resolveFilename(id: string): string {
  // Fix for @vitejs/plugin-vue in serve mode (#67)
  // To remove the annoying query parameters from the filename
  const [filename] = id.split('?vue');

  return filename;
}

/** # Fix for vue Single-File Components instrumentation in build mode. (cf issue #96)
 *
 * ## Option API SFC splits file into 2
 *
 * 1. id: /path/to/file.vue which contains all the code **What we need to instrument**
 * 2. id: /path/to/file.vue?vue&type=style&... which contains no source code
 *
 * ## Composition API SFC splits file into 3 chunks
 *
 * 1. id: /path/to/file.vue which contains only impors and exports but no user's source code
 * 2. id: /path/to/file.vue?vue&type=style&... which contains no source code
 * 3. id: /path/to/file.vue?vue&type=script&... which contains all the user's source code **What we need to instrument**
 *
 * ## Diff of chunk 1
 *
 * - Composition API: starts with `import _sfc_main from '/path/to/file.vue?vue&type=script...'\n`
 * - Option API: starts with `\nconst _sfc_main = {\n`
 *
 */
function canInstrumentChunk(id: string, srcCode: string): boolean {
  const is1stChunk = id.endsWith('.vue');
  const is2ndChunk = /\?vue&type=style/.test(id);
  const is3rdChunk = /\?vue&type=script/.test(id);
  const isCompositionAPI = /import _sfc_main from/.test(srcCode);
  if (is2ndChunk) {
    // never instrument type=style
    return false;
  }
  if (is3rdChunk) {
    // always instrument type=script
    return true;
  }
  if (is1stChunk) {
    // instrument 1st chunk only if it's Option API
    return !isCompositionAPI;
  }
  // instrument if not a vue chunk
  return true;
}

export default function istanbulPlugin(opts: IstanbulPluginOptions = {}): Plugin {
  const requireEnv = opts?.requireEnv ?? false;
  const checkProd = opts?.checkProd ?? true;
  const forceBuildInstrument = opts?.forceBuildInstrument ?? false;

  const logger = createLogger('warn', { prefix: 'vite-plugin-istanbul' });
  let testExclude: TestExclude;
  const instrumenter = createInstrumenter({
    coverageGlobalScopeFunc: false,
    coverageGlobalScope: 'globalThis',
    preserveComments: true,
    produceSourceMap: true,
    autoWrap: true,
    esModules: true,
    compact: false,
  });

  // Lazy check the active status of the plugin
  // as this gets fed after config is fully resolved
  let enabled = true;

  return {
    name: PLUGIN_NAME,
    apply(_, env) {
      // If forceBuildInstrument is true run for both serve and build
      return forceBuildInstrument ? true : env.command == 'serve';
    },
    // istanbul only knows how to instrument JavaScript,
    // this allows us to wait until the whole code is JavaScript to
    // instrument and sourcemap
    enforce: 'post',
    async config(config) {
      // If sourcemap is not set (either undefined or false)
      if (!config.build?.sourcemap) {
        logger.warn(
          `${PLUGIN_NAME}> ${yellow(
            'Sourcemaps was automatically enabled for code coverage to be accurate.\n To hide this message set build.sourcemap to true, "inline" or "hidden".'
          )}`
        );

        // Enforce sourcemapping,
        config.build ??= {};
        config.build.sourcemap = true;
      }
      testExclude = await createTestExclude(opts);
    },
    configResolved(config) {
      // We need to check if the plugin should enable after all configuration is resolved
      // As config can be modified by other plugins and from .env variables
      const { isProduction, env } = config;
      const { CYPRESS_COVERAGE } = process.env;
      const envPrefix = config.envPrefix ?? 'VITE_';

      const envCoverage = opts.cypress
        ? CYPRESS_COVERAGE
        : getEnvVariable('COVERAGE', envPrefix, env);
      const envVar = envCoverage?.toLowerCase() ?? '';

      if (
        (checkProd && isProduction && !forceBuildInstrument) ||
        (!requireEnv && envVar === 'false') ||
        (requireEnv && envVar !== 'true')
      ) {
        enabled = false;
      }
    },
    configureServer({ middlewares }) {
      if (!enabled) {
        return;
      }

      // Returns the current code coverage in the global scope
      // Used if an external endpoint is required to fetch code coverage
      middlewares.use((req, res, next) => {
        if (req.url !== COVERAGE_PUBLIC_PATH) {
          return next();
        }

        const coverage = global.__coverage__ ?? null;
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
    },
    transform(srcCode, id, options) {
      if (!enabled || options?.ssr || id.startsWith(MODULE_PREFIX) || id.startsWith(NULL_STRING)) {
        // do not transform if this is a dep
        // do not transform if plugin is not enabled
        // do not transform if ssr
        return;
      }
      if (!canInstrumentChunk(id, srcCode)) {
        return;
      }
      const filename = resolveFilename(id);

      if (testExclude.shouldInstrument(filename)) {
        // Instrument code using the combined source map of previous plugins
        const combinedSourceMap = sanitizeSourceMap(this.getCombinedSourcemap());
        const code = instrumenter.instrumentSync(srcCode, filename, combinedSourceMap);

        // Create an identity source map with the same number of fields as the combined source map
        const identitySourceMap = sanitizeSourceMap(
          createIdentitySourceMap(filename, srcCode, {
            file: combinedSourceMap.file,
            sourceRoot: combinedSourceMap.sourceRoot,
          })
        );

        // Create a result source map to combine with the source maps of previous plugins
        instrumenter.instrumentSync(srcCode, filename, identitySourceMap);
        const map = instrumenter.lastSourceMap();

        // Required to cast to correct mapping value
        return { code, map } as TransformResult;
      }
    },
  };
}
