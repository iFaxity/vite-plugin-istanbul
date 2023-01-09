declare module 'istanbul-lib-instrument' {
  import { ExistingRawSourceMap } from 'rollup';

  interface Instrumenter {
    instrumentSync(code: string, filename: string, inputSourceMap?: ExistingRawSourceMap): string;
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
    })

    shouldInstrument(filePath:string): boolean;
  }

  export = TestExclude;
}
