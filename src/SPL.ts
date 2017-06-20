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

	let patch = (o: Parser.ParserRule) => {
		let getOr = <T>(_: ((f: [Type, Context]) => T), x: T) => Let(ctx.cacheTypeParserRules.get(o), y => y ? _(y) : x);
		Object.defineProperty(o, 'TYPE', {
			get: () => getOr(([a]) => a.toString(), '!! not found'),
			enumerable: true,
			set: () => {}
		});
		Object.defineProperty(o, 'CTX', {
			get: () => getOr(([,a]) => a, <any>'!! not found'),
			enumerable: true,
			set: () => {}
		});
		o.getValuesDirectFlat().forEach(patch);
	}
	patch(o);

	// let xx = ctx.typeOf(o);
	ctx.typeOf(o); // compute all types before

	(<any>global).dbgCtx = ctx;
	(<any>global).dbg = (s:string) => {
		let decls = [...ctx.cacheTypeParserRules.values()].filter(o => o).map(o => (<[Type, Context]>o)[1])
								.map(c => <[Parser.ParserRule, number, TypeStorage]>c.identifiers.get(s)).filter(o => o).map(o => o[0]).getUniqueValues()
		let types = decls.map(o => <[Type, Context]>ctx.cacheTypeParserRules.get(o)).filter(o => o).map(o => o[0])
		return types;
	};
	let printFuns = (<any>global).printFuns = () => {
		// let decls = <ParserSPL.FunDecl[]>[...ctx.cacheTypeParserRules.values()].filter(o => o).map(o => (<[Type, Context]>o)[1])
		// 						.map(c => <[Parser.ParserRule, number, TypeStorage]>c.identifiers.get(s)).filter(o => o).map(o => o[0]).getUniqueValues()
		// 						.filter(o => o instanceof ParserSPL.FunDecl);
		let decls = <ParserSPL.FunDecl[]>[...ctx.cacheTypeParserRules.keys()].filter(o => o instanceof ParserSPL.FunDecl);
		console.log('######## BEGIN Debug: print functions with types'.bgGreen);			
		filterUndef(decls.map(o => Let(ctx.cacheTypeParserRules.get(o), x=>x ? Tuple(x, o) : undefined))).forEach(([[t, fctx], o]) => {
			console.log('');
			let realCtx = fctx.getStrictContextOf(true, o.name.content);
			if(!realCtx)
				throw o.error("In Debugger: NO META");
			let meta = realCtx.identifiers.get(o.name.content);
			if(!meta)
				throw o.error("In Debugger: NO META");

			console.log(('## '+o.name.content).bgWhite.black+(meta[2]==TypeStorage.Normal ? '' : ' (by reference)').red);
			console.log('\t'+o.print().magenta.replace(/\n/gm, '\n\t'));
			console.log('\tType := '+t);
		});
		console.log('######## END Debug: print functions with types'.bgGreen);			
	};

	console.log(printFuns());

	console.log('========================================');
	console.log('========================================');
	console.log('========================================');
	console.log('========================================');

	let SSM_output = ResolveSSM(o, ctx);

	console.log(printFuns());

	return SSM.toString(SSM_output);
};