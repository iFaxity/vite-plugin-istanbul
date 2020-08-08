"use strict";
const core_1 = require("@babel/core");
const babel_plugin_istanbul_1 = require("babel-plugin-istanbul");
const TestExclude = require("test-exclude");
function istanbulPlugin(opts = {}) {
    let exclude;
    const plugins = [babel_plugin_istanbul_1.default];
    const transform = {
        test(ctx) {
            if (ctx.isBuild || process.env.NODE_ENV == 'production') {
                // do not transform for production builds
                return false;
            }
            else if (ctx.path.startsWith('/@modules/') || ctx.path.includes('node_modules')) {
                // do not transform if this is a dep
                return false;
            }
            else if (!exclude) {
                exclude = new TestExclude({
                    cwd: process.cwd(),
                    include: opts.include,
                    exclude: opts.exclude,
                    extension: opts.extension,
                    excludeNodeModules: true
                });
            }
            return exclude.shouldInstrument(ctx.path);
        },
        transform(ctx) {
            const { code, map } = core_1.transformSync(ctx.code, {
                plugins,
                ast: false,
                sourceMaps: true,
                filename: ctx.path,
            });
            return { code, map };
        },
    };
    return { transforms: [transform] };
}
module.exports = istanbulPlugin;
//# sourceMappingURL=index.js.map