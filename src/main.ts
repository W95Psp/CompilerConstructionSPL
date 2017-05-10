import * as colors from 'colors';
import * as Lexer from './lexer';
import * as Parser from './parser';
import * as LexSPL from './spl.lexer';

import * as ParserSPL from './spl.parser';

console.log(LexSPL.SPL_Lexer);

let o = new LexSPL.SPL_Lexer(`
	var x = 5 ------------------ 20;

`);

// (<any>global).t = (str: string, h: string) => (<any>ParserSPL)[h].parse((new LexSPL.SPL_Lexer(str)).tokenDeck, <any>{addError: (e:any) => console.log(e)});


// (<any>global).t('var x = 5 -------- 20;', 'SPL');
// // (<any>global).t('var x = 5 ------------------ 20;', 'SPL');
// // ParserSPL.SPL_Parser.optimize();

// // console.log(o.tokens.map(o => o.inspect()));

// // let parser = new ParserSPL.SPL_Parser(o.tokenDeck);
// // console.log(parser.result);
// // debugger;

// // console.log((<any>global).t('', 'SPL'));

// console.log([...ParserSPL.SPL.getOpeningTokens()].map(o => o.name))

//let a = ParserSPL.Exp.getPossibleSequence();
// console.log(a.has([
// 	LexSPL.Id
// ]));

// SPL_Parser.optimize();
// debugger;
// var t;
// let p = new SPL_Parser();
// t = SPL.generateRand();
// console.log(t);
// console.log(t.print());
// setTimeout(() => {}, 100000000);
