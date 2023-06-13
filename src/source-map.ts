import * as esprima from 'esprima'
import {SourceMapGenerator} from 'source-map'


export function createIdenticalSourceMap(file: string, source: string) {
    const gen = new SourceMapGenerator({ file });
    const tokens = esprima.tokenize(source, { loc: true });

    tokens.forEach((token) => {
        const loc = (token as any).loc.start;
        gen.addMapping({
            source: file,
            original: loc,
            generated: loc
        });
    });

    return JSON.parse(gen.toString())
}
