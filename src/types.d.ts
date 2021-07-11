declare module "babel-plugin-istanbul" {
	import { PluginTarget } from "@babel/core"
	const plugin: PluginTarget
	export default plugin
}

declare module 'test-exclude' {
	class TestExclude {
		constructor(opts: {
			cwd?: string | string[],
			include?: string | string[],
			exclude?: string | string[],
			extension?: string | string[],
			excludeNodeModules?: boolean,
		})

		shouldInstrument(filePath:string):boolean
	}
	export = TestExclude
}