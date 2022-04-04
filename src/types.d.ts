declare module 'istanbul-lib-instrument' {
  import { SourceMap } from 'rollup';
  interface Instrumenter {
    instrumentSync(code: string, filename: string, inputSourceMap?: SourceMap | undefined): string;
    lastSourceMap(): SourceMap;
  }

  export function createInstrumenter(opts: {
    preserveComments?: boolean,
    produceSourceMap?: boolean,
    autoWrap?: boolean,
    esModules?: boolean,
  }): Instrumenter;
}

declare module '@istanbuljs/load-nyc-config' {
  export interface NYCConfig {
    extension?: string[];
    include?: string[];
    exclude?: string[];
  }

  export function loadNycConfig(opts: {
    cwd?: string,
    nycrcPath?: string,
  }): NYCConfig;
}

declare module 'test-exclude' {
  class TestExclude {
    constructor(opts: {
      cwd?: string | string[],
      include?: string | string[],
      exclude?: string | string[],
      extension?: string | string[],
      excludeNodeModules?: boolean,
    })

    shouldInstrument(filePath:string):boolean
  }
  export = TestExclude
}
