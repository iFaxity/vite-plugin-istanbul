import type { ExistingRawSourceMap } from 'rollup';
import type { TransformResult } from 'vite';

import type { CustomInstrumenter } from './options';
import {
  createCompleteSourceMap,
  createIdentitySourceMap,
  sanitizeSourceMap,
} from './source-map';

export function instrumentVueSFC(
  srcCode: string,
  filename: string,
  instrumenter: CustomInstrumenter,
  rawCombinedSourceMap: ExistingRawSourceMap,
  combinedSourceMap: ExistingRawSourceMap
): TransformResult {
  let originalSource: string | null = null;
  if (
    rawCombinedSourceMap.sourcesContent &&
    rawCombinedSourceMap.sourcesContent[0]
  ) {
    originalSource = rawCombinedSourceMap.sourcesContent[0];
  }

  const completeSourceMap = sanitizeSourceMap(
    createCompleteSourceMap(filename, srcCode, originalSource, {
      file: combinedSourceMap.file,
      sourceRoot: combinedSourceMap.sourceRoot,
    })
  );

  const code = instrumenter.instrumentSync(
    srcCode,
    filename,
    completeSourceMap
  );
  const map = instrumenter.lastSourceMap();

  return { code, map } as TransformResult;
}

export function instrumentCode(
  srcCode: string,
  filename: string,
  instrumenter: CustomInstrumenter,
  combinedSourceMap: ExistingRawSourceMap
): TransformResult {
  // For non-Vue files, use the two-pass instrumentation approach
  // to ensure proper source map handling
  const code = instrumenter.instrumentSync(
    srcCode,
    filename,
    combinedSourceMap
  );

  // Create an identity source map with the same number of fields as the combined source map
  const identitySourceMap = sanitizeSourceMap(
    createIdentitySourceMap(filename, srcCode, {
      file: combinedSourceMap.file,
      sourceRoot: combinedSourceMap.sourceRoot,
    })
  );

  // Create a result source map to combine with the source maps of previous plugins
  instrumenter.instrumentSync(srcCode, filename, identitySourceMap);
  const map = instrumenter.lastSourceMap();

  // Required to cast to correct mapping value
  return { code, map } as TransformResult;
}
