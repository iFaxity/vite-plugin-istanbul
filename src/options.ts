import type { GeneratorOptions } from '@babel/generator';

export type IstanbulPluginOptions = {
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
  onCover?: (fileName: string, fileCoverage: unknown) => void;
};
