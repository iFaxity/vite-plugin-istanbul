vite-plugin-istanbul
==========================

[![GitHub Workflow Status](https://img.shields.io/github/workflow/status/ifaxity/vite-plugin-istanbul/E2E%20and%20Unit%20Tests?style=for-the-badge&logo=github)](https://github.com/iFaxity/vite-plugin-istanbul/actions)
[![Codecov](https://img.shields.io/codecov/c/github/ifaxity/vite-plugin-istanbul?style=for-the-badge&logo=codecov)](https://codecov.io/gh/iFaxity/vite-plugin-istanbul)
[![Codacy grade](https://img.shields.io/codacy/grade/a0c628b128c044269faefc1da74382f7?style=for-the-badge&logo=codacy)](https://app.codacy.com/manual/iFaxity/vite-plugin-istanbul/dashboard)
[![Codacy coverage](https://img.shields.io/codacy/coverage/a0c628b128c044269faefc1da74382f7?style=for-the-badge&logo=codacy)](https://app.codacy.com/manual/iFaxity/vite-plugin-istanbul/dashboard)
[![npm (scoped)](https://img.shields.io/npm/v/vite-plugin-istanbul?style=for-the-badge&logo=npm)](https://npmjs.org/package/vite-plugin-istanbul)
[![npm bundle size (scoped)](https://img.shields.io/bundlephobia/min/vite-plugin-istanbul?label=Bundle%20size&style=for-the-badge)](https://npmjs.org/package/vite-plugin-istanbul)
[![npm bundle size (scoped)](https://img.shields.io/bundlephobia/minzip/vite-plugin-istanbul?label=Bundle%20size%20%28gzip%29&style=for-the-badge)](https://npmjs.org/package/vite-plugin-istanbul)

A Vite plugin to instrument your code for nyc/istanbul code coverage. In similar way as the Webpack Loader istanbul-instrumenter-loader. Only intended for use in development.


Installation
--------------------------
`$ npm i -D vite-plugin-istanbul`

or if you use yarn

`$ yarn add -D vite-plugin-istanbul`


API
--------------------------

```js
import IstanbulPlugin from 'vite-plugin-istanbul';
```

### [html( strings, ...values )](#html)

${method.description}

**Returns:** Vite Plugin

#### Parameters
* `opts {ElementOptions}`-


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
      exclude: [/node_modules/, 'test/'],
      extension: [ '.js', '.ts' ],
    }),
  ],
};
```


Testing (TODO: not yet finished)
--------------------------

```sh
$ npm run test
```


License
--------------------------

[MIT](./LICENSE)

