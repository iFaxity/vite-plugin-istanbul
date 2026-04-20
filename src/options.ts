import type { GeneratorOptions } from '@babel/generator';
import type { ExistingRawSourceMap } from 'rollup';

/**
 * Custom instrumenter interface. Matches the subset of istanbul-lib-instrument's
 * Instrumenter that this plugin uses. Implement this to use a faster instrumenter
 * (e.g., oxc-coverage-instrument) while keeping the Istanbul coverage format.
 */
export interface CustomInstrumenter {
  instrumentSync(
    code: string,
    filename: string,
    inputSourceMap?: ExistingRawSourceMap
  ): string;
  lastSourceMap(): ExistingRawSourceMap | null;
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
