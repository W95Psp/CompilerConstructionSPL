import * as fs from "fs";
import * as colors from "colors";
// import * as SPL from "./Lang/SPL";

// import {Lexer, LexerRule} from "./Lexer/lexer";
// // import {generateRandomProgram} from "./Parser/generateRandomPrograms";
// import {loadGrammar, _loadGrammar, retLoadGrammar} from "./Parser/loadGrammar";
// import {SPL_Grammar} from "./Lang/SPL_grammar";
// import {prettyPrint} from "./Parser/prettyPrint";
// import {Parser, ParserGroup, ParserAcceptToken, AcceptQuant} from "./Parser/parser";

// import {generateRandomProgram} from "./Parser/generateRandomPrograms";

import {} from "./lexer"
import {SPL_Lexer} from "./spl.lexer"
import {} from "./parser"
import {SPL_Parser} from "./spl.parser"

var program:any = require('commander');
 
program
  .usage('[options] <file ...>')
  .option('-d, --directory <dir>', 'Directory with test files')
  .option('-f, --filter <pattern>', 'Filter files with pattern', (s:string) => (f:string) => Boolean(f.match(new RegExp(s))), () => true)
  .option('-R, --recursive', 'Turn on recursive mode (if directory specified)')
  .option('-r, --random <n>', 'Test random n (-1 for infinity) programs', Number)
  // .option('--debug-path <value>', 'Change ./debug path', (o:any) => o, './debug')
  .option('-d, --parserdebug', 'Enable internal parser debugging')
  .option('-d, --debug', 'Save all trees and pretty prints')
  .option('-b, --bench <path>', 'Save times and sizes')
  .option('-p, --pause [<n>]', 'Pause between each (in ms)', Number, 0)
  .parse(process.argv);

if(program.directory===undefined && program.random===undefined){
	console.log("Must specify either directory or random");
	program.outputHelp();
	process.exit();
}else if(program.directory!==undefined && program.random!==undefined){
	console.log("Can't deal with directory and random at the same time");
	program.outputHelp();
	process.exit();
}

let fetchFiles = (path:string):string[] => {
	let files = fs.readdirSync(path).map(s => path+'/'+s);
	return [...files.filter(isfile).filter(program.filter), ...(program.recursive ? files.filter(isdir).reduce(freduce, []) : [])];
}
let freduce = (lst:string[], dname:string) => [...fetchFiles(dname), ...lst];
let isdir = (p:string) => fs.lstatSync(p).isDirectory();
let isfile = (p:string) => !isdir(p)
let test = (name: string, source: string, cb: Function) => {
	console.log("\nevaluate".yellow, name.bgYellow.black);
	let result = parseData(name, source);
	if(program.pause)
		setTimeout(() => cb(result), program.pause);
	else
		cb(result);
}


let random = () => SPL_Parser.getMainRule().generateRand().print();

let saveAs = (name: string, pp: string, ast: any) => {
	name = name.split('.').slice(0,-1).join('').split('/').pop() || 'unknown';
	fs.writeFileSync('debug/'+name+'.ast.json', JSON.stringify(ast.tree || ast, null, 3));
	fs.writeFileSync('debug/'+name+'.pretty-print.spl', pp);
}
let raw_parse = (data: string) => {
	let tokens = new SPL_Lexer(data);
	let parser = new SPL_Parser(tokens.tokenDeck);
	debugger;
	if(!parser.result || parser.errors.length)
		throw "Error detected :(";
	return [parser.result];
}
let parseData = (name: string, data: string) => {
	let [AST_1, error_1] = raw_parse(data);
	if(program.bench!==undefined){
		throw "To reimplement!";
		// fs.appendFileSync(program.bench.trim() || 'bench.txt', data.length.toString()+' '+firstResult.parser.duration+'\n');
	}

	let printed_1 = AST_1.print();

	if(program.debug)
		saveAs(name, printed_1, AST_1);

	let [AST_2, error_2] = raw_parse(printed_1);
	let printed_2 = AST_2.print();

	if(printed_1!=printed_2){
		saveAs('error.first.' + name, printed_1, AST_1);
		saveAs('error.second.' + name, printed_2, AST_2);
		console.log('Error pretty-prints do not match'.red, 'logs saved in ./debug');
	}else{
		if(program.debug)
			saveAs(name, printed_1, AST_1);
		console.log('So far so good!'.green);
		return true;
	}
	return false;
}
let parseFile = (path: string) => parseData(path, fs.readFileSync(path).toString());


let start_time = Date.now();
let next: Function, end = () => {
	console.log('\n');
	console.log('\n\n'.bgGreen);
	console.log('Finished in '+((Date.now() - start_time)+'ms').underline);
};
if(program.directory!==undefined){
	let lst = fetchFiles(program.directory), c;
	next = () => lst.length ? test(c=<string>lst.pop(), fs.readFileSync(c).toString(), next) : end();
}else
	next = () => program.random-- ? test('random program', random(), next) : end();

next();