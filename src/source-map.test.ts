import { SourceMapConsumer } from 'source-map';
import { describe, expect, it } from 'vitest';

import { createCompleteSourceMap } from './source-map';
import { getScriptBlockLineOffset } from './vue-sfc';

// Keeps fixture line numbers intact while letting them sit at the test's indent.
// TODO(reviewer): prefer the `dedent` package (MIT) over this? Costs a devDep.
function dedent(strings: TemplateStringsArray): string {
  const lines = strings.join('').replace(/^\n/, '').split('\n');
  const widths = lines
    .filter((line) => line.trim())
    .map((line) => line.length - line.trimStart().length);
  const indent = Math.min(...widths);

  return lines.map((line) => line.slice(indent)).join('\n');
}

// Maps a `?vue&type=script` chunk the way the transform hook does.
async function originalLineOf(
  sfc: string,
  chunk: string,
  generatedLine: number
): Promise<number | null> {
  const map = createCompleteSourceMap(
    'Example.vue',
    chunk,
    sfc,
    { file: 'Example.vue' },
    getScriptBlockLineOffset(sfc, 'Example.vue')
  );

  return await SourceMapConsumer.with(map as never, null, (consumer) => {
    return consumer.originalPositionFor({ line: generatedLine, column: 0 })
      .line;
  });
}

describe('getScriptBlockLineOffset', () => {
  it('counts the lines before a template-first script block', () => {
    expect(
      getScriptBlockLineOffset(
        dedent`
          <template>
            <p/>
          </template>

          <script setup>
          const a = 1;
          </script>
        `,
        'Example.vue'
      )
    ).toBe(5);
  });

  it('returns 0 when the block opens and closes on one line', () => {
    expect(
      getScriptBlockLineOffset(
        dedent`
          <script setup>const a = 1;</script>
        `,
        'Example.vue'
      )
    ).toBe(0);
  });

  it('takes the earliest block when both script and script setup exist', () => {
    expect(
      getScriptBlockLineOffset(
        dedent`
          <script>
          export default {};
          </script>
          <script setup>
          const a = 1;
          </script>
        `,
        'Example.vue'
      )
    ).toBe(1);
  });

  it('ignores a script tag inside the template', () => {
    expect(
      getScriptBlockLineOffset(
        dedent`
          <template>
            <p>{{ \`<script>\` }}</p>
          </template>

          <script setup>
          const a = 1;
          </script>
        `,
        'Example.vue'
      )
    ).toBe(5);
  });

  it('returns 0 when there is no script block', () => {
    expect(
      getScriptBlockLineOffset(
        dedent`
          <template>
            <p/>
          </template>
        `,
        'Example.vue'
      )
    ).toBe(0);
  });
});

describe('createCompleteSourceMap', () => {
  it('maps a script chunk back to its real lines in the SFC', async () => {
    expect(
      await originalLineOf(
        dedent`
          <template>
            <p/>
          </template>

          <script setup>
          const a = 1;

          function f() {
            return a;
          }
          </script>
        `,
        dedent`
          const a = 1;

          function f() {
            return a;
          }
        `,
        1
      )
    ).toBe(6);
  });

  it('keeps every chunk line inside the script block', async () => {
    expect(
      await originalLineOf(
        dedent`
          <template>
            <p/>
          </template>

          <script setup>
          const a = 1;

          function f() {
            return a;
          }
          </script>
        `,
        dedent`
          const a = 1;

          function f() {
            return a;
          }
        `,
        3
      )
    ).toBe(8);
  });

  it('leaves a script-first SFC unshifted', async () => {
    expect(
      await originalLineOf(
        dedent`
          <script setup>
          const a = 1;
          </script>

          <template>
            <p/>
          </template>
        `,
        dedent`
          const a = 1;
        `,
        1
      )
    ).toBe(2);
  });

  it('still maps line-for-line without an offset', async () => {
    const map = createCompleteSourceMap(
      'plain.ts',
      dedent`
        const a = 1;
        const b = 2;
      `,
      dedent`
        const a = 1;
        const b = 2;
      `,
      { file: 'plain.ts' }
    );

    expect(
      await SourceMapConsumer.with(map as never, null, (consumer) => {
        return consumer.originalPositionFor({ line: 2, column: 0 }).line;
      })
    ).toBe(2);
  });
});
