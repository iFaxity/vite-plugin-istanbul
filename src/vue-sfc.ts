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
const STYLE_CHUNK_REGEX = /\?vue&type=style/;
const SCRIPT_CHUNK_REGEX = /\?vue&type=script/;
const COMPOSITION_API_REGEX = /import _sfc_main from/;

export function canInstrumentVueChunk(id: string, srcCode: string): boolean {
  // never instrument type=style
  if (STYLE_CHUNK_REGEX.test(id)) {
    return false;
  }

  // always instrument type=script
  if (SCRIPT_CHUNK_REGEX.test(id)) {
    return true;
  }

  // instrument 1st chunk only if it's Option API
  if (id.endsWith('.vue')) {
    const isCompositionAPI = COMPOSITION_API_REGEX.test(srcCode);

    return !isCompositionAPI;
  }

  // instrument if not a vue chunk
  return true;
}
