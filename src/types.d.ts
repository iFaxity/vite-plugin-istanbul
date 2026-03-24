// Required for typings to work in configureServer()
declare var __coverage__: unknown;

declare module 'istanbul-lib-instrument' {
  import type { ExistingRawSourceMap } from 'rollup';
  import type { GeneratorOptions } from 'babel__generator';

  type Instrumenter = {
    instrumentSync(
      code: string,
      filename: string,
      inputSourceMap?: ExistingRawSourceMap
    ): string;
    lastSourceMap(): ExistingRawSourceMap;
    fileCoverage: unknown;
  };

  export function createInstrumenter(opts: {
    coverageVariable?: string;
    reportLogic?: boolean;
    preserveComments?: boolean;
    compact?: boolean;
    esModules?: boolean;
    autoWrap?: boolean;
    produceSourceMap?: boolean;
    ignoreClassMethods?: string[];
    sourceMapUrlCallback?(filename: string, sourceMapUrl: string): void;
    debug?: boolean;
    parserPlugins?: unknown[];
    coverageGlobalScope?: string;
    coverageGlobalScopeFunc?: boolean;
    generatorOpts?: GeneratorOptions;
  }): Instrumenter;
}

declare module '@istanbuljs/load-nyc-config' {
  export type NYCConfig = {
    extension?: string[];
    include?: string[];
    exclude?: string[];
  };

  export function loadNycConfig(opts: {
    cwd?: string;
    nycrcPath?: string;
  }): Promise<NYCConfig>;
}

declare module 'test-exclude' {
  class TestExclude {
    constructor(opts: {
      cwd?: string | string[];
      include?: string | string[];
      exclude?: string | string[];
      extension?: string | string[];
      excludeNodeModules?: boolean;
    });

    shouldInstrument(filePath: string): boolean;
  }

  export = TestExclude;
}

declare module 'espree' {
  // https://github.com/eslint/espree#options
  export type Options = {
    comment?: boolean;
    ecmaFeatures?: {
      globalReturn?: boolean;
      impliedStrict?: boolean;
      jsx?: boolean;
    };
    ecmaVersion?:
      | 3
      | 5
      | 6
      | 7
      | 8
      | 9
      | 10
      | 11
      | 12
      | 2015
      | 2016
      | 2017
      | 2018
      | 2019
      | 2020
      | 2021
      | 2022
      | 2023
      | 'latest';
    loc?: boolean;
    range?: boolean;
    sourceType?: 'script' | 'module';
    tokens?: boolean;
  };
  // https://github.com/eslint/espree#tokenize
  export function tokenize(code: string, options?: Options): any;
}
