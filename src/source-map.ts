import { tokenize } from 'espree';
import type { StartOfSourceMap } from 'source-map';
import { SourceMapGenerator } from 'source-map';
import type { ExistingRawSourceMap, SourceMap } from 'rollup';

// Create a source map which always maps to the same line and column
export function createIdentitySourceMap(
  file: string,
  source: string,
  option: StartOfSourceMap
) {
  const gen = new SourceMapGenerator(option);
  const tokens = tokenize(source, { ecmaVersion: 'latest', loc: true });

  tokens.forEach((token: any) => {
    const loc = token.loc.start;
    gen.addMapping({
      generated: loc,
      original: loc,
      source: file,
    });
  });

  return JSON.parse(gen.toString()) as SourceMap;
}

export function sanitizeSourceMap(rawSourceMap: ExistingRawSourceMap) {
  // Delete sourcesContent since it is optional and if it contains process.env.NODE_ENV vite will break when trying to replace it
  const { sourcesContent, ...sourceMap } = rawSourceMap;

  // JSON parse/stringify trick required for istanbul to accept the SourceMap
  return JSON.parse(JSON.stringify(sourceMap)) as ExistingRawSourceMap;
}
