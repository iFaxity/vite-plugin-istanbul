import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: ['src/index'],
  externals: [ 'rollup', 'vite', 'istanbul-lib-instrument', 'test-exclude', '@istanbuljs/load-nyc-config', 'picocolors' ],
  clean: true,
  declaration: true,
  rollup: {
    emitCJS: true,
    inlineDependencies: true,
  },
});
