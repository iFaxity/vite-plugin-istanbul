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
