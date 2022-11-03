import type { ExistingRawSourceMap } from 'rollup';
import { Plugin, TransformResult, createLogger } from 'vite';
import { createInstrumenter } from 'istanbul-lib-instrument';
import TestExclude from 'test-exclude';
import { loadNycConfig } from '@istanbuljs/load-nyc-config';
import picocolors from 'picocolors';

const { yellow } = picocolors;

// Required for typing to work in configureServer()
declare global {
  var __coverage__: any;
}

export interface IstanbulPluginOptions {
  include?: string|string[];
  exclude?: string|string[];
  extension?: string|string[];
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

function getEnvVariable(key: string, prefix: string|string[], env: Record<string, any>): string {
  if (Array.isArray(prefix)) {
    const envPrefix = prefix.find(pre => {
      const prefixedName = `${pre}${key}`;

      return env[prefixedName] != null;
    });

    prefix = envPrefix ?? '';
  }

  return env[`${prefix}${key}`];
}

function createTestExclude(opts: IstanbulPluginOptions): TestExclude {
  const { nycrcPath, include, exclude, extension } = opts;
  const cwd = opts.cwd ?? process.cwd();

  const nycConfig = loadNycConfig({
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

export default function istanbulPlugin(opts: IstanbulPluginOptions = {}): Plugin {
  const requireEnv = opts?.requireEnv ?? false;
  const checkProd = opts?.checkProd ?? true;
  const forceBuildInstrument = opts?.forceBuildInstrument ?? false;

  const logger = createLogger('warn', { prefix: 'vite-plugin-istanbul' });
  const testExclude = createTestExclude(opts);
  const instrumenter = createInstrumenter({
    coverageGlobalScopeFunc: false,
    coverageGlobalScope: 'window',
    preserveComments: true,
    produceSourceMap: true,
    autoWrap: true,
    esModules: true,
  });

  // Lazy check the active status of the plugin
  // as this gets fed after config is fully resolved
  let enabled = true;

  return {
    name: PLUGIN_NAME,
    apply: forceBuildInstrument ? 'build' : 'serve',
    // istanbul only knows how to instrument JavaScript,
    // this allows us to wait until the whole code is JavaScript to
    // instrument and sourcemap
    enforce: 'post',
    config(config) {
      // If sourcemap is not set (either undefined or false)
      if (!config.build?.sourcemap) {
        logger.warn(`${PLUGIN_NAME}> ${yellow(`Sourcemaps was automatically enabled for code coverage to be accurate.
 To hide this message set build.sourcemap to true, 'inline' or 'hidden'.`)}`);

        // Enforce sourcemapping,
        config.build = config.build || {};
        config.build.sourcemap = true;
      }
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

      if ((checkProd && isProduction && !forceBuildInstrument) ||
        (!requireEnv && envVar === 'false') ||
        (requireEnv && envVar !== 'true')) {
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
    },
    transform(srcCode, id, options) {
      if (!enabled || options?.ssr || id.startsWith(MODULE_PREFIX) || id.startsWith(NULL_STRING)) {
        // do not transform if this is a dep
        // do not transform if plugin is not enabled
        // do not transform if ssr
        return;
      }

      if (testExclude.shouldInstrument(id)) {
        const sourceMap = sanitizeSourceMap(this.getCombinedSourcemap());
        const code = instrumenter.instrumentSync(srcCode, id, sourceMap);
        const map = instrumenter.lastSourceMap();

        // Required to cast to correct mapping value
        return { code, map } as TransformResult;
      }
    },
  };
}
