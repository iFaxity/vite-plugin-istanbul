import * as espree from 'espree'
import {SourceMapGenerator, StartOfSourceMap} from 'source-map'


export function createIdentitySourceMap(file: string, source: string, option: StartOfSourceMap) {
    const gen = new SourceMapGenerator(option);
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
