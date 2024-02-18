import { defineBuildConfig } from 'unbuild';

import { dependencies, peerDependencies } from './package.json';

export default defineBuildConfig({
  entries: ['src/index'],
  externals: [...Object.keys(dependencies), ...Object.keys(peerDependencies)],
  clean: true,
  declaration: true,
  rollup: {
    emitCJS: true,
    inlineDependencies: true,
  },
});
