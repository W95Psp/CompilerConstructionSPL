// import * as colors from 'colors';
// import * as Lexer from './lexer';
// import * as Parser from './parser';
// import * as LexSPL from './spl.lexer';

// import * as ParserSPL from './spl.parser';

import * as fs from 'fs';
import {SPL_compile} from './SPL';

let file = process.argv[1];
let out = SPL_compile(fs.readFileSync(file).toString());