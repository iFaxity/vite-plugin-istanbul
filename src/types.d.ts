declare module 'istanbul-lib-instrument' {
  import { ExistingRawSourceMap } from 'rollup';

  interface Instrumenter {
    instrumentSync(
      code: string,
      filename: string,
      inputSourceMap?: ExistingRawSourceMap
    ): string;
    lastSourceMap(): ExistingRawSourceMap;
  }

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
    parserPlugins?: any[];
    coverageGlobalScope?: string;
    coverageGlobalScopeFunc?: boolean;
  }): Instrumenter;
}

declare module '@istanbuljs/load-nyc-config' {
  export interface NYCConfig {
    extension?: string[];
    include?: string[];
    exclude?: string[];
  }

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
  export interface Options {
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
  }
  // https://github.com/eslint/espree#tokenize
  export function tokenize(code: string, options?: Options): any;
}
