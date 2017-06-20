import * as colors from 'colors';
import * as Lexer from './lexer';
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


type SSM_resolver = (_: Parser.ParserRule) => string[][];
type SSM_Function = (o: Parser.ParserRule, g: SSM_resolver, ctx: Context) => string[][];
type SSM_Functions = Map<typeof Parser.ParserRule, SSM_Function>;

let MM = (_: [typeof Parser.ParserRule, SSM_Function][]) => new Map(_);

let SSM_getVar =(ref: Parser.ParserRule, id: string, ctx: Context, fetch=true) => {
	let pos = ctx.getValuePosition(id, ref);
	let meta = ctx.getValue_raw(id, ref);
	if(!pos || !meta)
		throw "Can't get position: variable not found (internal error)";
	let [,,x] = meta;
	// let thing = x == TypeStorage.Reference && fetch;
	// fetch = true;
	return flatten([[SSM.ldl(pos)], (x == TypeStorage.Reference && fetch) ? [SSM.lda(0)] : [], [
			SSM.annote('SP', 0, 0, 'black', '"get '+id+'"')
		]])
}

let cache_labels = new Set<string>();
let cache_labels_uId = 0;
let getUniqueLabel = (name: string) : string => {
	if(cache_labels.has(name))
		return getUniqueLabel(name+'_'+(++cache_labels_uId));	
	cache_labels.add(name);
	return name;
};

let SSM_resolve_field = (field: ParserSPL.Field | undefined): string[][] => {
	if(!field)
		return [];
	if(field.fieldName.content=='fst' || field.fieldName.content=='hd')
		return [SSM.lda(-1)];
	return [SSM.lda(0)];
}

export let GetSSM: SSM_Functions = MM([
	[ParserSPL.ExpPar, (o: ParserSPL.ExpPar, g, ctx) => g(o.exp)],
	[ParserSPL.Call, (o: ParserSPL.Call, g, ctx) => [...g(o.call), SSM.sts(0)]],
	[ParserSPL.ListCst, (o: ParserSPL.ListCst, g, ctx) => o.content ? [...g(o.content), SSM.ldc(0), SSM.stmh(2)] : [SSM.ldc(0)]],
	[ParserSPL.ExpTuple, (o: ParserSPL.ExpTuple, g, ctx) => [...g(o.left), ...g(o.right), SSM.stmh(2)]],
	[ParserSPL.Exp, (o: ParserSPL.Exp, g, ctx) => g(o.content)],
	[ParserSPL.ExpNOp2, (o: ParserSPL.ExpNOp2, g, ctx) => 
		o.content instanceof LexSPL.Integer	? [SSM.ldc(o.content.content)] :
		o.content instanceof LexSPL.Bool 	? [SSM.ldc(o.content.content == 'True' ? -1 : 0)] :
											  g(o.content)
	],
	[ParserSPL.ExpVar, (o: ParserSPL.ExpVar, g, ctx) => [...SSM_getVar(o, o.ident.content, ctx), ...SSM_resolve_field(o.field)]],
	[ParserSPL.ExpOp2, (o: ParserSPL.ExpOp2, g, ctx) => {
			let op = o.operator.content;
			let f:{[index: string]: string[][]} = {
					'-': 	[SSM.sub()],
					'+': 	[SSM.add()],
					'*': 	[SSM.mul()],
					'/': 	[SSM.div()],
					'%': 	[SSM.mod()],
					'==': 	[SSM.eq()],
					'<=': 	[SSM.le()],
					'>=': 	[SSM.ge()],
					'!=': 	[SSM.ne()],
					'&&': 	[SSM.and()],
					'||': 	[SSM.or()],
					'<': 	[SSM.lt()],
					'>': 	[SSM.gt()],
					':': 	[SSM.stmh(2)]
				}
			return [...g(o.left), ...g(o.right), ...f[op]];
	}],
	[ParserSPL.ExpOp1, (o: ParserSPL.ExpOp1, g, ctx) => [...g(o.exp), o.operator.content=='-' ? SSM.sub() : SSM.not()]],
	[ParserSPL.VarDecl, (o: ParserSPL.VarDecl, g, ctx) => {
		let meta = ctx.getValue_raw(o.name.content, o);
		if(!meta)
			throw o.error('Err (internal:SSM:VarDecl)');
		let [,,storage] = meta;
		let annotR = SSM.annote('SP', 0, 0, 'red', '"refTo '+o.name.content+'"');
		let annot = SSM.annote('SP', 0, 0, 'red', '"var '+o.name.content+'"');
		return [
			...storage==TypeStorage.Normal ? [...g(o.exp), annot] : [...g(o.exp), SSM.sth(), annotR]];
	}],
	[ParserSPL.Decl, (o: ParserSPL.Decl, g, ctx) => [...g(o.content)]],
	[ParserSPL.Stmt, (o: ParserSPL.Decl, g, ctx) => [...g(o.content)]],
	[ParserSPL.Block, (o: ParserSPL.Block, g, ctx) => [...g(o.content)]],
	[ParserSPL.BlockAcc, (o: ParserSPL.BlockAcc, g, ctx) => flatten(o.lines.map(o => g(o)))],
	[ParserSPL.Assign, (o: ParserSPL.Assign, g, ctx) => {
		let name = o.ident.content;
		let meta = ctx.getValue_raw(name, o);
		if(!meta)
			throw o.error('Err (internal:SSM:Assign)');
		let [pr,,storage] = meta;

		let type = ctx.cacheTypeParserRules.get(pr);
		if(!type)
			throw o.error("It looks like you trying assign a native object.\nHint: if you want to reimplement a native object, just redeclare it. Native functions cannot be used as values.");
			
		let pos = ctx.getValuePosition(name, o);
		if(storage==TypeStorage.Normal)
			return [...g(o.exp), SSM.stl(pos)];
		return [...g(o.exp), SSM.ldl(pos), ...SSM_resolve_field(o.field), SSM.sta(0)]
	}],
	[ParserSPL.SPL, (o: ParserSPL.SPL, g, ctx) => {
		return [SSM.link(1), ...flatten([...o.decls.map(o => g(o))])];
	}],
	[ParserSPL.While, (o: ParserSPL.While, g, ctx) => {
		let labelEnd = getUniqueLabel('end_while');
		let labelBegin = getUniqueLabel('begin_while');
		let condition = g(o.cond);
		condition[0] = SSM.label(labelBegin, condition[0]);
		return [
			...condition,
			SSM.brf(labelEnd),
			...g(o.block),
			SSM.bra(labelBegin),
			SSM.label(labelEnd, SSM.nop())
		];
	}],
	[ParserSPL.If, (o: ParserSPL.If, g, ctx) => {
		let labelElse = getUniqueLabel('endif');
		let labelEnd = getUniqueLabel('endelse');
		return [
			...g(o.cond),
			SSM.brf(labelElse),
			...g(o.block),
			SSM.bra(labelEnd),
			SSM.label(labelElse, SSM.nop()),
			...(o.else ? g(o.else.block) : []),
			SSM.label(labelEnd, SSM.nop())
		];
	}],
	[ParserSPL.FunCall, (o: ParserSPL.FunCall, g, ctx) => {
		let fundeclPR = ctx.getValue(o.name.content, o);
		if(!fundeclPR)
			throw o.error("Function does not exists (internal error)");
		let objType = ctx.typeOf(fundeclPR);
		if(!objType || !(objType[0] instanceof FunctionType))
			throw o.error("ERRR not function type (internal error, client.ts, lookup)");

		if((<any>fundeclPR)._stdlib){
			let std = (<any>fundeclPR)._stdlibName;
			let typeOf = (o:Parser.ParserRule) => {
				let r = ctx.typeOf(o);
				if(!r)
					throw "STDLIB Internal error: resolving calling types";
				return r[0];
			};
			let fun = ctx.standartLibrary.get(std);
			if(!fun)
				throw "Errrrr";
			return [
				...flatten(o.inputs.map(o => g(o))),
				...fun[1](...o.inputs.map(typeOf))
			];
		}

		// let address = SSM_getVar(o, o.name.content, ctx, false);
		let address = SSM_getVar(o, o.name.content, ctx);

		let label = getUniqueLabel('after_fc_'+o.name.content);
		return [
				...flatten(o.inputs.map(o => g(o))),
				...address,
				SSM.ldrr('RR', 'PC'),
				SSM.bra('fetchOutsideVars'),
				SSM.sts(2),
				SSM.link(0),
				SSM.ldc(label),
				SSM.lds(1),
				SSM.str('PC'), 
				SSM.label(label, SSM.ldr('RR'))
			];
	}],
	[ParserSPL.Ret, (o: ParserSPL.Ret, g, ctx) => {
		if(!o.exp)
			throw o.error("Returning void: not supported yet");

		return [...g(o.exp),
			SSM.str('RR'),
			SSM.ldl(1),/*get previous PC*/
			SSM.str('R5'),//store it in R5
			SSM.unlink(),
			SSM.ldr('SP'),
			SSM.ldc(ctx.outsideVariables.size + ctx.numArgs),
			SSM.sub(),
			SSM.str('SP'),
			SSM.ldr('R5'),
			SSM.ret()];
	}],
	[ParserSPL.FunDecl, (o: ParserSPL.FunDecl, g, ctx) => {
		let parentScope = ctx.parent || <Context>{};

		let label = getUniqueLabel('body_'+o.name.content);
		let body = [...flatten([...o.varDecls, ...o.funDecls, ...o.Stmt].map(o => g(o)))];

		body[0] = SSM.label(label, body[0]);
		// let dbg0 = [...fctx.outsideVariables].map(o => o+' in pos '+(<any>ctx.getValue_raw)(o, null)[1]).join(' | ');
		// let dbg1 = flatten([...fctx.outsideVariables].map(name => SSM_getVar(o, name, ctx))).map(o => o.join(' '));
		let ousideVariable: string[][] = [];
		let indexMe = -1;
		if(ctx.parent)
			ousideVariable = flatten([...ctx.outsideVariables].map((name, i) => {
				if(name==o.name.content){
					indexMe = i;
					return [SSM.ldc(0)];
				}
				return SSM_getVar(o, name, parentScope, false);
			}));
		else if(ctx.outsideVariables.size)
			throw "Internal error";

		if(o.name.content=='foldl')
			debugger;

		if(!ctx.parent)
			throw "XXX";
		let meta = ctx.parent.identifiers.get(o.name.content);
		if(!meta)
			throw o.error("FunDecl not typed (internal error)");
		let typeStorage = meta[2];
			

		let afterLabel = getUniqueLabel('after_'+o.name.content);
		return [
			...ousideVariable,
			SSM.ldc(label),
			SSM.ldc(ctx.outsideVariables.size + 1),
			SSM.stmh(ctx.outsideVariables.size + 2 /*nb + PC*/),
			...(indexMe==-1 ? [] : [
					SSM.lds(0),
					...(typeStorage==TypeStorage.Normal ? [['HEYHEY']] : [SSM.ldc(1), SSM.add()]),
					SSM.lds(-1),
					SSM.annote('HP', 0, 0, 'red', '"Recursive pointer"'),
					SSM.sta(-(ctx.outsideVariables.size+2-indexMe-1))
				]),
			SSM.annote('SP', 0, 0, 'green', '"funDecl '+o.name.content+'"'),
			...(typeStorage==TypeStorage.Normal ? [] :
				[
					SSM.sth(),
					SSM.annote('SP', 0, 0, 'green', '"ref funDecl '+o.name.content+'"')
				]
				),
			SSM.bra(afterLabel),
			...body,
			SSM.label(afterLabel, SSM.nop())
		];
	}]
]);


export let ResolveSSM = (s: Parser.ParserRule, baseContext: Context) => {
 	let fetchFunArgs = /*eats a stack input and result n outputs*/`
 		bra fetchOutsideVars_after
		fetchOutsideVars: lds 0
			lds 0
			sts -1
			sts -1
			; lds 0  address
			ldc 1
			sub

			lds 2
			lda 0 ; counter

			ldc ldmhJump
			ldc 2
			add ; address

			sta 0

			ldmhJump: ldmh 0 0

			ldr RR
			ldc 2
			add
			str PC

		fetchOutsideVars_after: nop
		`.split('\n').filter(o => o.trim()).map(o => o.split(';')[0].trim().split(/[\t ]+/g)
				.map(o => o.trim()).filter(o => o));

	let getCtxRec = (s: Parser.ParserRule): Context => {
		let r = s instanceof ParserSPL.SPL ? Tuple(null, baseContext) : baseContext.typeOf(s);
		let x = r ? r[1] : getCtxRec(s.parent);
		if(!x) throw "Err";
		return x;
	}
	let g = (s: Parser.ParserRule): string[][] => (GetSSM.get(s.static) || ((_:any) => [['? for '+s.static.name]]))(s, g, getCtxRec(s));
	return [...fetchFunArgs, ...g(s)];
};
