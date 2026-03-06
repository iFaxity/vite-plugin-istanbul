import * as espree from 'espree';
import { SourceMapGenerator, StartOfSourceMap } from 'source-map';

// Create a source map which always maps to the same line and column
export function createIdentitySourceMap(
  file: string,
  source: string,
  option: StartOfSourceMap
) {
  const gen = new SourceMapGenerator(option);
  const tokens = espree.tokenize(source, { loc: true, ecmaVersion: 'latest' });

  tokens.forEach((token: any) => {
    const loc = token.loc.start;
    gen.addMapping({
      source: file,
      original: loc,
      generated: loc,
    });
  });

  return JSON.parse(gen.toString());
}

// Creates a complete source map that maps all lines of compiled code to the original file.
// This fixes coverage for Vue SFCs where Vite's source map only covers the script portion,
// leaving template-generated code (render function) unmapped and causing 0% coverage.
export function createCompleteSourceMap(
  file: string,
  source: string,
  originalSource: string | null,
  option: StartOfSourceMap
) {
  const gen = new SourceMapGenerator(option);
  const lines = source.split('\n');
  const originalLines = originalSource
    ? originalSource.split('\n').length
    : lines.length;

  lines.forEach((line, lineIndex) => {
    const tokens: Array<{ loc: { start: { line: number; column: number } } }> =
      [];

    try {
      tokens.push(
        ...espree.tokenize(line, { loc: true, ecmaVersion: 'latest' })
      );
    } catch {
      // If tokenization fails (e.g., partial statement), add a single mapping for the line
      tokens.push({ loc: { start: { line: 1, column: 0 } } });
    }

    tokens.forEach((token) => {
      // Map each generated token back to the closest original line
      const originalLine = Math.min(lineIndex + 1, originalLines);
      gen.addMapping({
        source: file,
        original: { line: originalLine, column: 0 },
        generated: { line: lineIndex + 1, column: token.loc.start.column },
      });
    });
  });

  if (originalSource) {
    gen.setSourceContent(file, originalSource);
  }

  return JSON.parse(gen.toString());
}
