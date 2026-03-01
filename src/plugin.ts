import { createInstrumenter } from 'istanbul-lib-instrument';
import { yellow } from 'picocolors';
import type TestExclude from 'test-exclude';
import type { Plugin, TransformResult } from 'vite';
import { createLogger } from 'vite';

import { createIdentitySourceMap, sanitizeSourceMap } from './source-map';
import { canInstrumentVueChunk } from './vue-sfc';
import { createTestExclude, getEnvVariable, resolveFilename } from './lib';
import type { IstanbulPluginOptions } from './options';

const COVERAGE_PUBLIC_PATH = '/__coverage__';
const PLUGIN_NAME = 'vite:istanbul';
const MODULE_PREFIX = '/@modules/';
const NULL_STRING = '\0';

export function istanbulPlugin(opts: IstanbulPluginOptions = {}): Plugin {
  const requireEnv = opts?.requireEnv ?? false;
  const checkProd = opts?.checkProd ?? true;
  const forceBuildInstrument = opts?.forceBuildInstrument ?? false;

  const logger = createLogger('warn', { prefix: 'vite-plugin-istanbul' });
  let testExclude: TestExclude;
  const instrumenter = createInstrumenter({
    autoWrap: true,
    compact: false,
    coverageGlobalScope: 'globalThis',
    coverageGlobalScopeFunc: false,
    esModules: true,
    generatorOpts: { ...opts?.generatorOpts },
    preserveComments: true,
    produceSourceMap: true,
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
          `${PLUGIN_NAME}> ${yellow(`Sourcemaps was automatically enabled for code coverage to be accurate.
To hide this message set build.sourcemap to true, 'inline' or 'hidden'.`)}`
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
        } catch (error) {
          return next(error);
        }

        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(data);
      });
    },
    transform(srcCode, id, options) {
      if (
        !enabled ||
        options?.ssr ||
        id.startsWith(MODULE_PREFIX) ||
        id.startsWith(NULL_STRING)
      ) {
        // do not transform if this is a dep
        // do not transform if plugin is not enabled
        // do not transform if ssr
        return;
      }

      // Fix for Vue SFC
      if (!canInstrumentVueChunk(id, srcCode)) {
        return;
      }

      const filename = resolveFilename(id);

      if (testExclude.shouldInstrument(filename)) {
        // Instrument code using the combined source map of previous plugins
        const combinedSourceMap = sanitizeSourceMap(
          this.getCombinedSourcemap()
        );
        const code = instrumenter.instrumentSync(
          srcCode,
          filename,
          combinedSourceMap
        );

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
        const { fileCoverage } = instrumenter;

        if (opts.onCover) {
          opts.onCover(filename, fileCoverage);
        }

        // Required to cast to correct mapping value
        return { code, map } as TransformResult;
      }
    },
  };
}
