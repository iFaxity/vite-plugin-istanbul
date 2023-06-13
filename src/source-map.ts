import * as espree from 'espree'
import {SourceMapGenerator} from 'source-map'


export function createIdenticalSourceMap(file: string, source: string) {
    const gen = new SourceMapGenerator({ file });
    const tokens = espree.tokenize(source, { loc: true, ecmaVersion: 'latest' });

    tokens.forEach((token: any) => {
        const loc = token.loc.start;
        gen.addMapping({
            source: file,
            original: loc,
            generated: loc
        });
    });

    return JSON.parse(gen.toString())
}
