import { createInstrumenter } from 'istanbul-lib-instrument';
import { yellow } from 'picocolors';
import TestExclude from 'test-exclude';
import { createLogger, Plugin, TransformResult } from 'vite';

import { MODULE_PREFIX, NULL_STRING, PLUGIN_NAME } from './constants';
import { coverageMiddleware } from './middleware';
import type { CustomInstrumenter, IstanbulPluginOptions } from './options';
import { sanitizeSourceMap } from './source-map';
import { instrumentCode, instrumentVueSFC } from './transform';
import { createTestExclude, getEnvVariable, resolveFilename } from './utils';
import { canInstrumentChunk } from './vue-sfc';

// Required for typings to work in configureServer()
declare global {
  var __coverage__: any;
}

export function istanbulPlugin(opts: IstanbulPluginOptions = {}): Plugin {
  const requireEnv = opts?.requireEnv ?? false;
  const checkProd = opts?.checkProd ?? true;
  const forceBuildInstrument = opts?.forceBuildInstrument ?? false;

  const logger = createLogger('warn', { prefix: 'vite-plugin-istanbul' });
  let testExclude: TestExclude;
  const instrumenter: CustomInstrumenter =
    opts.instrumenter ??
    createInstrumenter({
      coverageGlobalScopeFunc: false,
      coverageGlobalScope: 'globalThis',
      preserveComments: true,
      produceSourceMap: true,
      autoWrap: true,
      esModules: true,
      compact: false,
      generatorOpts: { ...opts?.generatorOpts },
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

      middlewares.use(coverageMiddleware);
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
      if (!canInstrumentChunk(id, srcCode)) {
        return;
      }

      const filename = resolveFilename(id);

      if (testExclude.shouldInstrument(filename)) {
        // Get the raw combined source map before sanitization to preserve sourcesContent
        const rawCombinedSourceMap = this.getCombinedSourcemap();
        const combinedSourceMap = sanitizeSourceMap(rawCombinedSourceMap);

        // For Vue SFC files, create a complete source map that covers all compiled lines.
        // Vite's source map only covers the <script> block, leaving template-generated code
        // (render function) unmapped, which causes Istanbul to report 0% coverage.
        const isVueSFC = id.endsWith('.vue') || /\?vue&type=script/.test(id);

        let result: TransformResult;
        if (isVueSFC) {
          result = instrumentVueSFC(
            srcCode,
            filename,
            instrumenter,
            rawCombinedSourceMap,
            combinedSourceMap
          );
        } else {
          result = instrumentCode(
            srcCode,
            filename,
            instrumenter,
            combinedSourceMap
          );
        }

        const fileCoverage = instrumenter.fileCoverage;
        if (opts.onCover) {
          opts.onCover(filename, fileCoverage);
        }

        return result;
      }
    },
  };
}
