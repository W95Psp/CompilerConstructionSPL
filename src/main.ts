// import * as colors from 'colors';
// import * as Lexer from './lexer';
// import * as Parser from './parser';
// import * as LexSPL from './spl.lexer';

// import * as ParserSPL from './spl.parser';

import * as fs from 'fs';
import * as cp from 'child_process';
import {SPL_compile} from './SPL';
var tty = require('tty');

let file = process.argv[2];
let opt = process.argv[3];
let out = SPL_compile(fs.readFileSync(file).toString());
// let out = SPL_compile('globalScope() :: -> Int {\n'+fs.readFileSync(file).toString()+'\n return 0;} var globalScopeV = globalScope();');

fs.writeFileSync('tmp.ssm', out);
if(opt=='run'){
    let sp = cp.spawn('java.exe', ['-jar', 'ssm/ssm.jar', '--cli', '--file', 'tmp.ssm'], {stdio: [process.stdin, process.stdout, process.stderr]});
    // process.stdin.pipe(sp.stdin);
    // sp.stdout.pipe(process.stdout);
    // sp.stderr.pipe(process.stderr);
    // let x = cp.execSync('java.exe -jar ssm/ssm.jar --cli --file tmp.ssm');
    // console.log(x.toString());
}else if(opt=='run-gui'){
    let x = cp.execSync('java.exe -jar ssm/ssm.jar --file tmp.ssm');
}