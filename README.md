vite-plugin-istanbul
==========================

[![Codacy grade](https://img.shields.io/codacy/grade/a0c628b128c044269faefc1da74382f7?style=for-the-badge&logo=codacy)](https://app.codacy.com/manual/iFaxity/vite-plugin-istanbul/dashboard)
[![npm (scoped)](https://img.shields.io/npm/v/vite-plugin-istanbul?style=for-the-badge&logo=npm)](https://npmjs.org/package/vite-plugin-istanbul)
[![npm bundle size (scoped)](https://img.shields.io/bundlephobia/min/vite-plugin-istanbul?label=Bundle%20size&style=for-the-badge)](https://npmjs.org/package/vite-plugin-istanbul)
[![npm bundle size (scoped)](https://img.shields.io/bundlephobia/minzip/vite-plugin-istanbul?label=Bundle%20size%20%28gzip%29&style=for-the-badge)](https://npmjs.org/package/vite-plugin-istanbul)

A Vite plugin to instrument your code for nyc/istanbul code coverage. In similar way as the Webpack Loader istanbul-instrumenter-loader. Only intended for use in development.

Version v2.x for Vite v2.0, for Vite v1.0 install v1.x of this plugin.

As of v2.1.0 you can toggle the coverage off by setting the env variable `VITE_COVERAGE='false'`, by default it will always instrument the code. To require the explicit definition of the variable, set the option `requireEnv` to **true**.

Installation
--------------------------
`npm i -D vite-plugin-istanbul`

or if you use yarn

`yarn add -D vite-plugin-istanbul`

API
--------------------------

```js
import IstanbulPlugin from 'vite-plugin-istanbul';
```

### [IstanbulPlugin( [ opts ] )](#istanbul-plugin)

Creates the vite plugin from a set of optional plugin options.

**Returns:** Vite Plugin

#### Parameters
* `opts {IstanbulPluginOptions}` - Object of optional options to pass to the plugin
* `opts.include {string|string[]}` - Optional string or array of strings of glob patterns to include
* `opts.exclude {string|string[]}` - Optional string or array of strings of glob patterns to exclude
* `opts.extension {string|string[]}` - Optional string or array of strings of extensions to include (dot prefixed like .js or .ts)
* `opts.requireEnv {boolean}` - Optional boolean to require env to be true to instrument to code, otherwise it will instrument even if env variable is not set
* `opts.cypress {boolean}` - Optional boolean to change the env to CYPRESS_COVERAGE instead of VITE_COVERAGE. For more ease of use with @cypress/code-coverage
* `opts.babelConfig {babel.TransformOptions}` - Optional object change the babel setup to add plusgins to the parser (typescript, flow) [See Babel Docs for full list of options](https://babeljs.io/docs/en/options)

Examples
--------------------------

To use this plugin define it using vite.config.js

```js
// vite.config.js
const istanbul = require('vite-plugin-istanbul');

module.exports = {
  open: true,
  port: 3000,
  plugins: [
    istanbul({
      include: 'src/*',
      exclude: ['node_modules', 'test/'],
      extension: [ '.js', '.ts' ],
    }),
  ],
};
```

License
--------------------------

[MIT](./LICENSE)
