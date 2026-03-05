import { defineBuildConfig } from 'unbuild';

import { dependencies, peerDependencies } from './package.json';

export default defineBuildConfig({
  clean: true,
  declaration: true,
  entries: ['src/index'],
  externals: [...Object.keys(dependencies), ...Object.keys(peerDependencies)],
  rollup: {
    inlineDependencies: true,
  },
});
