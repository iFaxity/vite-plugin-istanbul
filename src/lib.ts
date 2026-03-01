import { loadNycConfig } from '@istanbuljs/load-nyc-config';
import TestExclude from 'test-exclude';
import type { IstanbulPluginOptions } from './options';

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

export function getEnvVariable(
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

export async function createTestExclude(
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
    exclude: exclude ?? nycConfig.exclude,
    excludeNodeModules: true,
    extension: extension ?? nycConfig.extension ?? DEFAULT_EXTENSION,
    include: include ?? nycConfig.include,
  });
}

export function resolveFilename(id: string): string {
  // Fix for @vitejs/plugin-vue in serve mode (#67)
  // To remove the annoying query parameters from the filename
  const [filename] = id.split('?vue', 2);

  return filename;
}
