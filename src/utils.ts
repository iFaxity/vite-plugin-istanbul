import { loadNycConfig } from '@istanbuljs/load-nyc-config';
import TestExclude from 'test-exclude';

import { DEFAULT_EXTENSION } from './constants';
import type { IstanbulPluginOptions } from './options';

export function getEnvVariable(
  key: string,
  prefix: string | string[],
  env: Record<string, any>
) {
  if (Array.isArray(prefix)) {
    const envPrefix = prefix.find((pre) => {
      const prefixedName = `${pre}${key}`;

      return env[prefixedName] != null;
    });

    prefix = envPrefix ?? '';
  }

  return env[`${prefix}${key}`];
}

export async function createTestExclude(opts: IstanbulPluginOptions) {
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

export function resolveFilename(id: string) {
  // Fix for @vitejs/plugin-vue in serve mode (#67)
  // To remove the annoying query parameters from the filename
  const [filename] = id.split('?vue');

  return filename;
}
