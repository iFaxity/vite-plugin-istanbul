import type { GeneratorOptions } from '@babel/generator';
import { loadNycConfig } from '@istanbuljs/load-nyc-config';
import { createInstrumenter } from 'istanbul-lib-instrument';
import picocolors from 'picocolors';
import TestExclude from 'test-exclude';
import { createLogger, Plugin, TransformResult } from 'vite';

import {
  createCompleteSourceMap,
  createIdentitySourceMap,
  type RawSourceMap,
} from './source-map';
import { canInstrumentChunk } from './vue-sfc';

const { yellow } = picocolors;

// Required for typings to work in configureServer()
declare global {
  var __coverage__: any;
}

/**
 * Custom instrumenter interface. Matches the subset of istanbul-lib-instrument's
 * Instrumenter that this plugin uses. Implement this to use a faster instrumenter
 * (e.g., oxc-coverage-instrument) while keeping the Istanbul coverage format.
 */
export interface CustomInstrumenter {
  instrumentSync(
    code: string,
    filename: string,
    inputSourceMap?: RawSourceMap
  ): string;
  lastSourceMap(): RawSourceMap | null;
  fileCoverage: object;
}

export interface IstanbulPluginOptions {
  include?: string | string[];
  exclude?: string | string[];
  extension?: string | string[];
  requireEnv?: boolean;
  cypress?: boolean;
  checkProd?: boolean;
  forceBuildInstrument?: boolean;
  verbose?: boolean;
  cwd?: string;
  nycrcPath?: string;
  generatorOpts?: GeneratorOptions;
  onCover?: (fileName: string, fileCoverage: object) => void;
  /**
   * Custom instrumenter to use instead of istanbul-lib-instrument.
   * Must implement `instrumentSync`, `lastSourceMap`, and `fileCoverage`.
   *
   * @example
   * ```ts
   * import { createOxcInstrumenter } from 'oxc-coverage-instrument/vitest';
   *
   * istanbul({
   *   instrumenter: createOxcInstrumenter(),
   * })
   * ```
   */
  instrumenter?: CustomInstrumenter;
}

// Custom extensions to include .vue files
const DEFAULT_EXTENSION = [
  '.js',
  '.cjs',
  '.mjs',
  '.ts',
  '.tsx',
  '.jsx',
  '.vue',
];
const COVERAGE_PUBLIC_PATH = '/__coverage__';
const PLUGIN_NAME = 'vite:istanbul';
const MODULE_PREFIX = '/@modules/';
const NULL_STRING = '\0';

function sanitizeSourceMap(rawSourceMap: RawSourceMap): RawSourceMap {
  // Delete sourcesContent since it is optional and if it contains process.env.NODE_ENV vite will break when trying to replace it
  const { sourcesContent, ...sourceMap } = rawSourceMap;

  // JSON parse/stringify trick required for istanbul to accept the SourceMap
  return JSON.parse(JSON.stringify(sourceMap));
}

function getEnvVariable(
  key: string,
  prefix: string | string[],
  env: Record<string, any>
): string {
  if (Array.isArray(prefix)) {
    const envPrefix = prefix.find((pre) => {
      const prefixedName = `${pre}${key}`;

      return env[prefixedName] != null;
    });

    prefix = envPrefix ?? '';
  }

  return env[`${prefix}${key}`];
}

function getEnvVariableNames(key: string, prefix: string | string[]): string[] {
  const prefixes = Array.isArray(prefix) ? prefix : [prefix];

  return prefixes.map((pre) => `${pre}${key}`);
}

function formatEnvVariableNames(names: string[]): string {
  return names.length === 1
    ? names[0]
    : names.map((name) => `'${name}'`).join(' or ');
}

async function createTestExclude(
  opts: IstanbulPluginOptions
): Promise<TestExclude> {
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

export default function istanbulPlugin(
  opts: IstanbulPluginOptions = {}
): Plugin {
  const requireEnv = opts?.requireEnv ?? false;
  const checkProd = opts?.checkProd ?? true;
  const forceBuildInstrument = opts?.forceBuildInstrument ?? false;
  const verbose = opts?.verbose ?? false;

  const logger = createLogger(verbose ? 'info' : 'warn', {
    prefix: 'vite-plugin-istanbul',
  });
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
  const logVerbose = (message: string) => {
    if (verbose) {
      logger.info(`${PLUGIN_NAME}> ${message}`);
    }
  };

  return {
    name: PLUGIN_NAME,
    apply(_, env) {
      // If forceBuildInstrument is true run for both serve and build
      if (forceBuildInstrument) {
        logVerbose(
          'Instrumentation is enabled for both serve and build because forceBuildInstrument is true.'
        );
        return true;
      }

      if (env.command == 'serve') {
        logVerbose('Instrumentation is enabled for the serve command.');
        return true;
      }

      logVerbose(
        'Skipping instrumentation for the build command because forceBuildInstrument is false.'
      );
      return false;
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
      const coverageEnvNames = opts.cypress
        ? ['CYPRESS_COVERAGE']
        : getEnvVariableNames('COVERAGE', envPrefix);
      const coverageEnvLabel = formatEnvVariableNames(coverageEnvNames);

      const envCoverage = opts.cypress
        ? CYPRESS_COVERAGE
        : getEnvVariable('COVERAGE', envPrefix, env);
      const envVar = envCoverage?.toLowerCase() ?? '';

      if (checkProd && isProduction && !forceBuildInstrument) {
        enabled = false;
        logVerbose(
          'Skipping instrumentation because the resolved Vite config is production and checkProd is true.'
        );
        return;
      }

      if (!requireEnv && envVar === 'false') {
        enabled = false;
        logVerbose(
          `Skipping instrumentation because ${coverageEnvLabel} is set to false.`
        );
        return;
      }

      if (requireEnv && envVar !== 'true') {
        enabled = false;
        logVerbose(
          `Skipping instrumentation because ${coverageEnvLabel} must be set to true when requireEnv is true.`
        );
        return;
      }

      logVerbose('Instrumentation is enabled after config resolution.');
    },
    configureServer({ middlewares }) {
      if (!enabled) {
        return;
      }

      logVerbose(`Serving coverage data at ${COVERAGE_PUBLIC_PATH}.`);

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
      if (
        !enabled ||
        id.startsWith(MODULE_PREFIX) ||
        id.startsWith(NULL_STRING)
      ) {
        // do not transform if this is a dep
        // do not transform if plugin is not enabled
        return;
      }

      if (options?.ssr) {
        logVerbose(
          `Skipping ${id} because SSR transforms are not instrumented.`
        );
        return;
      }

      if (!canInstrumentChunk(id, srcCode)) {
        logVerbose(
          `Skipping ${id} because this Vue chunk does not contain instrumentable source.`
        );
        return;
      }
      const filename = resolveFilename(id);

      if (!testExclude.shouldInstrument(filename)) {
        logVerbose(
          `Skipping ${filename} because it does not match the include and exclude rules.`
        );
        return;
      }

      // Get the raw combined source map before sanitization to preserve sourcesContent
      const rawCombinedSourceMap = this.getCombinedSourcemap();
      const combinedSourceMap = sanitizeSourceMap(rawCombinedSourceMap);

      // For Vue SFC files, create a complete source map that covers all compiled lines.
      // Vite's source map only covers the <script> block, leaving template-generated code
      // (render function) unmapped, which causes Istanbul to report 0% coverage.
      const isVueSFC = id.endsWith('.vue') || /\?vue&type=script/.test(id);

      if (isVueSFC) {
        let originalSource: string | null = null;
        if (
          rawCombinedSourceMap.sourcesContent &&
          rawCombinedSourceMap.sourcesContent[0]
        ) {
          originalSource = rawCombinedSourceMap.sourcesContent[0];
        }

        const completeSourceMap = sanitizeSourceMap(
          createCompleteSourceMap(filename, srcCode, originalSource, {
            file: combinedSourceMap.file,
            sourceRoot: combinedSourceMap.sourceRoot,
          })
        );

        const code = instrumenter.instrumentSync(
          srcCode,
          filename,
          completeSourceMap
        );
        const map = instrumenter.lastSourceMap();

        const fileCoverage = instrumenter.fileCoverage;
        if (opts.onCover) {
          opts.onCover(filename, fileCoverage);
        }
        logVerbose(`Instrumented ${filename}.`);
        return { code, map } as TransformResult;
      }

      // For non-Vue files, use the two-pass instrumentation approach
      // to ensure proper source map handling
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

      const fileCoverage = instrumenter.fileCoverage;
      if (opts.onCover) {
        opts.onCover(filename, fileCoverage);
      }
      logVerbose(`Instrumented ${filename}.`);
      // Required to cast to correct mapping value
      return { code, map } as TransformResult;
    },
  };
}
