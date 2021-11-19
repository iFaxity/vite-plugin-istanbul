"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const istanbul_lib_instrument_1 = require("istanbul-lib-instrument");
const test_exclude_1 = __importDefault(require("test-exclude"));
// Custom extensions to include .vue files
const DEFAULT_EXTENSION = ['.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx', '.vue'];
const COVERAGE_PUBLIC_PATH = '/__coverage__';
const PLUGIN_NAME = 'vite:istanbul';
function sanitizeSourceMap(sourceMap) {
    // JSON parse/stringify trick required for istanbul to accept the SourceMap
    return JSON.parse(JSON.stringify(sourceMap));
}
function createConfigureServer() {
    return ({ middlewares }) => {
        // Returns the current code coverage in the global scope
        middlewares.use((req, res, next) => {
            var _a;
            if (req.url !== COVERAGE_PUBLIC_PATH) {
                return next();
            }
            const coverage = (_a = (global.__coverage__)) !== null && _a !== void 0 ? _a : null;
            let data;
            try {
                data = JSON.stringify(coverage, null, 4);
            }
            catch (ex) {
                return next(ex);
            }
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(data);
        });
    };
}
function createTransform(opts = {}) {
    var _a;
    const exclude = new test_exclude_1.default({
        cwd: opts.cwd || process.cwd(),
        include: opts.include,
        exclude: opts.exclude,
        extension: (_a = opts.extension) !== null && _a !== void 0 ? _a : DEFAULT_EXTENSION,
        excludeNodeModules: true,
    });
    const instrumenter = istanbul_lib_instrument_1.createInstrumenter({
        preserveComments: true,
        produceSourceMap: true,
        autoWrap: true,
        esModules: true,
    });
    return function (srcCode, id) {
        if (id.startsWith('/@modules/')) {
            // do not transform if this is a dep
            return;
        }
        if (exclude.shouldInstrument(id)) {
            const sourceMap = sanitizeSourceMap(this.getCombinedSourcemap());
            const code = instrumenter.instrumentSync(srcCode, id, sourceMap);
            const map = instrumenter.lastSourceMap();
            // Required to cast to correct mapping value
            return { code, map };
        }
    };
}
function istanbulPlugin(opts = {}) {
    var _a, _b, _c;
    // Only instrument when we want to, as we only want instrumentation in test
    // By default the plugin is always on
    const env = (opts.cypress ? process.env.CYPRESS_COVERAGE : process.env.VITE_COVERAGE);
    const envValue = env === null || env === void 0 ? void 0 : env.toLowerCase();
    const requireEnv = (_a = opts === null || opts === void 0 ? void 0 : opts.requireEnv) !== null && _a !== void 0 ? _a : false;
    const prodCheck = (_b = opts === null || opts === void 0 ? void 0 : opts.checkProd) !== null && _b !== void 0 ? _b : true;
    if ((prodCheck && ((_c = process.env.NODE_ENV) === null || _c === void 0 ? void 0 : _c.toLowerCase()) === 'production') ||
        (!requireEnv && envValue === 'false') ||
        (requireEnv && envValue !== 'true')) {
        return { name: PLUGIN_NAME };
    }
    return {
        name: PLUGIN_NAME,
        transform: createTransform(opts),
        configureServer: createConfigureServer(),
        // istanbul only knows how to instrument JavaScript,
        // this allows us to wait until the whole code is JavaScript to
        // instrument and sourcemap
        enforce: 'post',
    };
}
module.exports = istanbulPlugin;
//# sourceMappingURL=index.js.map