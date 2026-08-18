import { createRequire } from 'node:module';

/** # Fix for vue Single-File Components instrumentation in build mode. (cf issue #96)
 *
 * ## Option API SFC splits file into 2
 *
 * 1. id: /path/to/file.vue which contains all the code **What we need to instrument**
 * 2. id: /path/to/file.vue?vue&type=style&... which contains no source code
 *
 * ## Composition API SFC splits file into 3 chunks
 *
 * 1. id: /path/to/file.vue which contains only impors and exports but no user's source code
 * 2. id: /path/to/file.vue?vue&type=style&... which contains no source code
 * 3. id: /path/to/file.vue?vue&type=script&... which contains all the user's source code **What we need to instrument**
 *
 * ## Diff of chunk 1
 *
 * - Composition API: starts with `import _sfc_main from '/path/to/file.vue?vue&type=script...'\n`
 * - Option API: starts with `\nconst _sfc_main = {\n`
 *
 */
type ScriptBlock = { loc: { start: { line: number } }; content: string };
type SfcParse = (
  source: string,
  options: { filename: string }
) => { descriptor: { script?: ScriptBlock; scriptSetup?: ScriptBlock } };

const require = createRequire(import.meta.url);

// A `?vue&type=script` chunk starts at line 1, but its code starts further down
// the SFC. Earliest block wins: `<script>` + `<script setup>` compile as one.
export function getScriptBlockLineOffset(
  originalSource: string,
  filename: string
): number {
  let parse: SfcParse;
  try {
    ({ parse } = require('@vue/compiler-sfc'));
  } catch {
    // Not a Vue project, or the compiler isn't installed — leave lines as-is.
    return 0;
  }

  const { descriptor } = parse(originalSource, { filename });
  const blocks = [descriptor.script, descriptor.scriptSetup].filter(
    (block): block is ScriptBlock => Boolean(block)
  );
  if (blocks.length === 0) {
    return 0;
  }

  const first = blocks.reduce((earliest, block) =>
    block.loc.start.line < earliest.loc.start.line ? block : earliest
  );
  return first.content.startsWith('\n')
    ? first.loc.start.line
    : first.loc.start.line - 1;
}

export function canInstrumentChunk(id: string, srcCode: string): boolean {
  const is1stChunk = id.endsWith('.vue');
  const is2ndChunk = /\?vue&type=style/.test(id);
  const is3rdChunk = /\?vue&type=script/.test(id);
  const isCompositionAPI = /import _sfc_main from/.test(srcCode);
  if (is2ndChunk) {
    // never instrument type=style
    return false;
  }
  if (is3rdChunk) {
    // always instrument type=script
    return true;
  }
  if (is1stChunk) {
    // instrument 1st chunk only if it's Option API
    return !isCompositionAPI;
  }
  // instrument if not a vue chunk
  return true;
}
