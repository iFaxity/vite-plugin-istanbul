import type { ResolvedConfig } from 'vite';
import { describe, expect, it } from 'vitest';

import istanbulPlugin, { type IstanbulPluginOptions } from '../src/index';

const source = 'export function answer() { return 42; }';
const transformContext = {
  getCombinedSourcemap() {
    return {
      version: 3,
      sources: ['src/example.ts'],
      names: [],
      mappings: '',
      file: 'src/example.ts',
    };
  },
};

type TransformHook = (
  this: typeof transformContext,
  srcCode: string,
  id: string,
  options?: { ssr?: boolean }
) => unknown | Promise<unknown>;

async function createPlugin(options: IstanbulPluginOptions = {}) {
  const plugin = istanbulPlugin({
    include: 'src/example.ts',
    requireEnv: true,
    ...options,
  });

  if (typeof plugin.config === 'function') {
    await plugin.config(
      { build: { sourcemap: true } },
      { command: 'serve', mode: 'test' }
    );
  }

  if (typeof plugin.configResolved === 'function') {
    plugin.configResolved({
      env: { VITE_COVERAGE: 'true' },
      envPrefix: 'VITE_',
      isProduction: false,
    } as ResolvedConfig);
  }

  return plugin;
}

function getCode(result: unknown) {
  if (result && typeof result === 'object' && 'code' in result) {
    const { code } = result;

    return typeof code === 'string' ? code : '';
  }

  return '';
}

describe('SSR transforms', () => {
  it('keeps SSR instrumentation disabled by default', async () => {
    const plugin = await createPlugin();
    const transform = plugin.transform as TransformHook;

    const result = await transform.call(
      transformContext,
      source,
      'src/example.ts',
      {
        ssr: true,
      }
    );

    expect(result).toBeUndefined();
  });

  it('can instrument Vitest SSR modules when explicitly enabled', async () => {
    const plugin = await createPlugin({ enableInSSR: true });
    const transform = plugin.transform as TransformHook;

    const result = await transform.call(
      transformContext,
      source,
      'src/example.ts',
      {
        ssr: true,
      }
    );

    expect(getCode(result)).toContain('var global = globalThis;');
    expect(getCode(result)).toContain('var gcv = "__coverage__";');
  });
});
