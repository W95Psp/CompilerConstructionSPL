import * as colors from 'colors';
import * as Parser from './parser';
import * as LexSPL from './spl.lexer';
import {Let, Tuple, Tuple3, flatten, filterUndef, SimpleUniqueTree} from './tools';
import * as SSM from './SSM_spec';

// import * as Types from './type';
import {
	TypeStorage, ErrorUnifying,Replacement,applyReplacements,Type,UnknownType,FunctionType,ListType,TupleType,UnknownTypeLimited,VariableType, IntegerType, BooleanType,Context,CombinedType,TypeSetParserRule
} from './type';

import * as T from './type';
import * as ParserSPL from './spl.parser';

import {TSPR} from './spl.types';
import {GetSSM,ResolveSSM} from './spl.ssm';


let StdLibDefiner = (i: [string, [Type, (..._: Type[]) => string[][]]][]) => new Map<string, [Type, (..._: Type[]) => string[][]]>(i);
let StdLib = StdLibDefiner([
	['print', [new FunctionType([new IntegerType()], new IntegerType()), () => [
		SSM.trap(0), SSM.ldc(0)
	]]],
	['input', [new FunctionType([], new IntegerType()), () => [
		SSM.trap(10),
	]]],
	['empty', [new FunctionType([new ListType(new VariableType([]))], new BooleanType()), () => [
		SSM.ldc(0),SSM.eq()
	]]]
]);

ParserSPL.SPL_Parser.optimize();
export let SPL_compile = (source: string):string => {
	let l = new LexSPL.SPL_Lexer(source);

	let p = new ParserSPL.SPL_Parser(l.tokenDeck);

	if(!p.result)
		throw "Some errors occured.";
		
	let o = <ParserSPL.SPL>p.result;
	let ctx = new Context(o, TSPR, StdLib);
	// let xx = ctx.typeOf(o);
	ctx.typeOf(o); // compute all types before

	(<any>global).dbgCtx = ctx;
	(<any>global).dbg = (s:string) => {
		let decls = [...ctx.cacheTypeParserRules.values()].filter(o => o).map(o => (<[Type, Context]>o)[1])
								.map(c => <[Parser.ParserRule, number, TypeStorage]>c.identifiers.get(s)).filter(o => o).map(o => o[0]).getUniqueValues()
		let types = decls.map(o => <[Type, Context]>ctx.cacheTypeParserRules.get(o)).filter(o => o).map(o => o[0])
		return types;
	};

	let SSM_output = ResolveSSM(o, ctx);

	return SSM.toString(SSM_output);
};