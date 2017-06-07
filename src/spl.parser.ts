import {Token, EOF, DeterministicToken} from './lexer';
import * as LexSPL from './spl.lexer';
import * as T from './type';
import {Let, SimpleTree, flatten, filterUndef} from './tools';
import {ParserRule, Parser, ppIdent, ppNewLine, ppPutVal} from './parser';

export class SPL_Parser extends Parser {
	computeTypes() {
		// if(!this.result)
		// 	throw "No result available";
		// let main = <SPL>this.result;
		// let ctx = new T.Context();
		// let functionsNames = Object.keys(nativeFunctions).filter(o => /^[a-z]/i.test(o));
		// functionsNames.forEach(content => ctx.set(content, new T.FunctionType(<any>{NATIVE: true, name: {content}}, nativeFunctions[content])));
		// main.decls.forEach(f => ctx.set(f.name.content, new T.NotResolvedYet(<any>{notResovledYetThing: true})));
		// main.decls.forEach(d => d.getType(ctx));
		// main.decls.forEach(d => d.clearTypeCaches());
		// ctx.sealFunctions();
		// main.decls.forEach(d => d.getType(ctx));
		// main.decls.forEach(d => console.log(d.name.content, d.getType(ctx)));
		// // main.variables.forEach(v => v.getType(ctx));
		// console.log("Final context is ",ctx);
	}
}

// let gInt = () => new T.BasicType(this, true);
// let gBool = () => new T.BasicType(this, false);
// let gName = (content:string) => <FunDecl>({name:{content}});
// let IntIntBool = (f: (_: ParserRule[]) => string[]) => new T.FunDefType(this, [gInt(), gInt()], gBool(), f);
// let IntIntInt = (f: (_: ParserRule[]) => string[]) => new T.FunDefType(this, [gInt(), gInt()], gInt(), f);
// let wrInps = (imp: ParserRule[]) => imp.map(o => o.SSM()).reduce((p,c) => p.concat(c), []);
// let nativeFunctions: {[index: string]: T.FunDefType[]} = {
// 	'+': [IntIntInt(inps => [...wrInps(inps), 'add'])],
// 	'-': [IntIntInt(inps => [...wrInps(inps), 'sub'])],
// 	'*': [IntIntInt(inps => [...wrInps(inps), 'mul'])],
// 	'/': [IntIntInt(inps => [...wrInps(inps), 'div'])],
// 	'<': [IntIntBool(inps => [...wrInps(inps), 'lt'])],
// 	'>': [IntIntBool(inps => [...wrInps(inps), 'gt'])],
// 	'==': [
// 		IntIntBool(inps => [...wrInps(inps), 'eq']),
// 		new T.FunDefType(this, [gBool(), gBool()], gBool(), inps => [...wrInps(inps), 'eq']),
// 		new T.FunDefType(this, [
// 			new T.ListType(this, new T.VariableType(this, 'innerType')),
// 			new T.ListType(this, new T.VariableType(this, 'innerType'))
// 		], gBool(), inps => [...wrInps(inps), 'eq'])
// 	],
// 	'!=': [IntIntBool(inps => [...wrInps(inps), 'ne'])],
// 	'<=': [IntIntBool(inps => [...wrInps(inps), 'le'])],
// 	'>=': [IntIntBool(inps => [...wrInps(inps), 'ge'])],
// 	'&&': [IntIntBool(inps => [...wrInps(inps), 'and'])],
// 	'||': [IntIntBool(inps => [...wrInps(inps), 'or'])],
// 	'print_integer': [new T.FunDefType(gName('print_integer'), [gInt()], new T.VoidType(this), ([o]) => [...o.SSM(), 'trap 0'])],
// 	':': [
// 		new T.FunDefType(this, [
// 										 new T.VariableType(this, 'A'),
// 					new T.ListType(this, new T.VariableType(this, 'A'))
// 				], new T.ListType(this, new T.VariableType(this, 'A')), (imp: ParserRule[]) => {
// 			return [...imp.reverse().map(o => o.SSM()).reduce((p,c) => p.concat(c)), 'stmh 2'];
// 		})
// 	]
// };

export abstract class FunCallLike extends ParserRule {
	abstract get inputs() : ParserRule[];
	abstract get funName() : string;
	// abstract get funDefs() : T.FunctionType;
	// typeDefinition: T.FunDefType | T.FunDefType[];

	// _getType(ctx: T.Context) : T.Type{
	// 	if(this.funDefs instanceof T.NotResolvedYet)
	// 		return this.funDefs;
	// 	let result = this.funDefs.getBestFunction(this.inputs.map(o => <T.Type>o.getType(ctx)).filter(o => o));
	// 	this.typeDefinition = result.funDef;
	// 	return result.outputType;
	// }
	// getFunction(ctx: T.Context) : T.Type{
		// return this.funDefs.getTypeDef(this.inputs.map(o => <T.Type>o.getType(ctx)).filter(o => o));
	// }
	// SSM() {
	// 	// let o = this.getType(this.ctx);
	// 	// let inps = ;
	// 	if(!(this.typeDefinition instanceof Array) && this.typeDefinition.native)
	// 		return this.typeDefinition.native(this.inputs);
	// 	return this.inputs.map(o => o.SSM()).reduce((p,c) => p.concat(c), []);
	// }
}

export class SPL extends ParserRule{
	@SPL_Parser.addOptStep() 		decls: Decl[];
	@SPL_Parser.addStep() 		_eof: EOF;
	get lines () {return this.decls.map(o => o.content)}
	get variables () { return <VarDecl[]>this.lines.filter(o => o instanceof VarDecl) }
	get functions () { return <FunDecl[]>this.lines.filter(o => o instanceof FunDecl) }
	// _getType not needed
	// SSM () : string[] {
	// 	let isFirstVar = true;
	// 	let prog = ['link 1', 'bra entryPoint', ...this.decls.map(o => {
	// 		let R = o.SSM();
	// 		if(isFirstVar && o.content instanceof VarDecl){
	// 			isFirstVar = false;
	// 			R[0] = 'entryPoint: '+R[0];
	// 		}
	// 		return R;
	// 	}).reduce((p,c) => p.concat(c), [])];
	// 	if(isFirstVar)
	// 		prog.push('entryPoint: halt');
	// 	return prog;
	// }
	SSM () : string[] {
		let isFirstVar = true;
		let vars = this.variables.map(o => o.SSM()).reduce((p,c) => p.concat(c), []);
		if(vars.length)
			vars[0] = 'entryPoint: '+vars[0];
		let prog = [
				'link 0', 'ldr MP', 'bra entryPoint',
				...this.functions.map(o => o.SSM()).reduce((p,c) => p.concat(c), []),
				...vars
			];
		if(!vars.length)
			prog.push('entryPoint: halt');
		return prog;
	}
}
export class Decl extends ParserRule{
	@SPL_Parser.addStep() 		content: (VarDecl | FunDecl);
	get name() { return this.content.name; }
	// _getType not needed
	SSM() {
		return this.content.SSM();
	}
}
@ppIdent
@ppNewLine
export class VarDecl extends ParserRule{
	@SPL_Parser.addStep() 		type: LexSPL.Var | Type;
	@SPL_Parser.addStep() 		name: LexSPL.Id;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.Equal )
			   .addStep() 		exp: Exp;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.Semicolon )
	_: void;
	// _getType(ctx: T.Context) : T.VoidType{
	// 	if(ctx.hasLocal(this.name.content)){
	// 		if(!(ctx.get(this.name.content) instanceof T.NotResolvedYet) && !ctx.functionSealed)
	// 			throw "Variable "+this.name.content+" is already declared in the current scope";
	// 	}
	// 	ctx.set(this.name.content, this.exp.getType(ctx));
	// 	return new T.VoidType(this);
	// }
	// SSM() : string[] {
	// 	return this.exp.SSM();
	// }
}

export class VarOrFunDecl extends ParserRule{
	@SPL_Parser.addStep() 		content: (VarDecl | FunDecl);
	// _getType not needed
	SSM() {
		return this.content.SSM();
	}
}

enum ReturnPathsStates {
	MightReturn,
	WillReturn
};
type ReturnPaths = {complete: boolean, list: ParserRule[]};
let filterUndefined = <T>(l: (T|undefined)[]) => <T[]>l.filter(o => o !== undefined);


@ppNewLine
export class FunDecl extends ParserRule{
	@SPL_Parser.addStep() 		name: LexSPL.Id;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.OpeningParenthesis )
			   .addOptStep() 	_args?: FArgs;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.ClosingParenthesis )
			   .addOptStep() 	type?: FunDeclT;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.OpeningCurlyBracket )
			   .addOptStep()	varDecls: VarDecl[];
	@SPL_Parser.addOptStep()	funDecls: FunDecl[];
	@SPL_Parser.addStep() 		Stmt: Stmt[];
	@SPL_Parser.addIgnoreTokenStep( LexSPL.ClosingCurlyBracket )
	_: void;
	get args() {
		if(!this._args) return [];
		return this._args.args;
	}
	getReturnPaths() {
		type X = {maybe: Ret[], concl: Ret[]};
		let compose = (A:X, B: X) =>
			A.concl.length && B.concl.length ? {maybe: [...A.maybe, ...B.maybe], concl: [...A.concl, ...B.concl]} :
			A.concl.length == B.concl.length ? undefined : {maybe: [...A.maybe, ...B.maybe, ...A.concl, ...B.concl], concl: []};

		let treatStmtArray = (o: Stmt[]) => {
			let r = o.map(o => get(o));
			if(!r.length || r.every(o => !o))
				return undefined;
			let returnForSureIndex = r.findIndex(o => !!o && o.concl.length > 0);
			if(returnForSureIndex != -1 && returnForSureIndex != r.length - 1)
				throw o[returnForSureIndex+1].error("Unreachable code");
			let x = filterUndef(r);
			if(x[x.length-1].concl.length)
				return {maybe: flatten(x.map(o => o.maybe)), concl: x[x.length-1].concl};
			return {maybe: flatten(x.map(o => [...o.maybe, ...o.concl])), concl: []};
		}
		let treatIf = (o: If)=>{
			let [bs, b1, b2] = [<X[]>[], get(o.block), o.else ? get(o.else.block) : undefined];
			b1 && bs.push(b1);
			b2 && bs.push(b2);
			return  bs.length == 0 ? undefined :
					bs.length == 1 ? {maybe: [...bs[0].maybe, ...bs[0].concl], concl: []}
										 : compose(bs[0], bs[1]);
		}
		let get = (o: Assign | Call | If | While | Ret | Stmt[] | Block | Stmt) : X | undefined =>
			o instanceof Assign ? undefined :					o instanceof Call 	? undefined :
			o instanceof Ret 	? {maybe: [], concl: [o]} :		o instanceof Array 	? treatStmtArray(o) :
			o instanceof Stmt	? get(o.content) :				o instanceof Block	? get(o.lines()) :
			o instanceof If		? treatIf(o) : Let(get(o.block), o => o ? ({maybe: [...o.maybe, ...o.concl], concl: []}) : undefined);
		return get(this.Stmt);
	}
}
export class FunDeclT extends ParserRule{
	@SPL_Parser.addIgnoreTokenStep( LexSPL.DoubleColons )
			   .addStep() 		type: FunType;
	// _getType(ctx: T.Context) : T.Type {
	// 	return this.type.getType(ctx);
	// }
}
export class RetType extends ParserRule{
	@SPL_Parser.addStep() 		type: Type | LexSPL.Void;
	// _getType(ctx: T.Context) : T.Type {
	// 	if(this.type instanceof ParserRule)
	// 		return this.type.getType(ctx);
	// 	return new T.VoidType(this);
	// }
}
export class FunType extends ParserRule{
	@SPL_Parser.addOptStep() 	inputs: Type[];
	@SPL_Parser.addIgnoreTokenStep( LexSPL.Arrow )
			   .addStep() 		output: RetType;
	// _getType(ctx: T.Context) : T.Type {
	// 	return <any>null;
	// 	// return new T.FunctionType(this, this.inputs.map(o => o.getType(ctx)), this.output.getType(ctx));
	// }
}
export class TupleType extends ParserRule{
	@SPL_Parser.addIgnoreTokenStep( LexSPL.OpeningParenthesis )
			   .addStep() 		left: Type;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.Comma )
			   .addStep() 		right: Type;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.ClosingParenthesis )
	_: void;
	// _getType(ctx: T.Context) : T.Type {
	// 	return new T.TupleType(this, this.left.getType(ctx), this.right.getType(ctx));
	// }
}
export class ListType extends ParserRule{
	@SPL_Parser.addIgnoreTokenStep( LexSPL.OpeningBracket )
			   .addStep() 		type: Type;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.ClosingBracket )
	_: void;
	// _getType(ctx: T.Context) : T.Type {
	// 	return new T.ListType(this, this.type.getType(ctx));
	// }
}
export class Type extends ParserRule{
	@SPL_Parser.addStep() 		type: LexSPL.BasicType | LambdaType | VarType | TupleType | ListType | LexSPL.Id;
	// _getType(ctx: T.Context) : T.Type {
	// 	return 	this.type instanceof ParserRule ? this.type.getType(ctx) :
	// 			this.type instanceof LexSPL.Id 	? new T.VariableType(this, this.type.content)
	// 											: new T.BasicType(this, this.type.content=='Int')
	// }
}
export class VarType extends ParserRule{
	@SPL_Parser.addIgnoreTokenStep( LexSPL.OpeningParenthesis )
			   .addIgnoreTokenStep( LexSPL.Var )
			   .addStep() 		name: LexSPL.Id;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.DoubleColons )
			   .addStep() 		inner: VarType_Choices | LexSPL.Any;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.ClosingParenthesis )
	_: void;
}
export class LambdaType extends ParserRule{
	@SPL_Parser.addIgnoreTokenStep( LexSPL.OpeningParenthesis )
			   .addStep() 		fun: FunType;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.ClosingParenthesis )
	_: void;
}
export class VarType_Choices extends ParserRule{
	@SPL_Parser.addStep() 		couldBe: Type[];
}
export class FArgsOpt extends ParserRule{
	@SPL_Parser.addStep() 		name: LexSPL.Id;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.Comma )
	_: void;
}
export class FArgs extends ParserRule{
	@SPL_Parser.addOptStep()	_args: FArgsOpt[];
	@SPL_Parser.addStep() 		name: LexSPL.Id;
	get args() {
		return [...this._args.map(o => o.name), this.name];
	}
}
@ppNewLine
export class Else extends ParserRule{
	@SPL_Parser.addIgnoreTokenStep( LexSPL.Else )
			   .addStep() 		block: Block;
	// _getType not needed
}
let measureProg = (p: string[]) => 
	p.map(o => (o.trim().match(/ +/g)||[]).length + 1).reduce((count, o) => count + o, 0);
@ppNewLine
export class If extends ParserRule{
	@SPL_Parser.addIgnoreTokenStep( LexSPL.If )
			   .addIgnoreTokenStep( LexSPL.OpeningParenthesis )
			   .addStep() 		cond: Exp;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.ClosingParenthesis )
			   .addStep() 		block: Block;
	@SPL_Parser.addOptStep() 	else?: Else;
	// _getType(ctx: T.Context) : T.VoidType {
	// 	checkConditionBoolean(ctx, this.cond);
	// 	this.block.getType(ctx);
	// 	this.else && this.else.getType(ctx);
	// 	return new T.VoidType(this);
	// }
	// SSM () : string[] {
	// 	let ifPart = this.block.SSM();
	// 	let elsePart = this.else ? this.else.SSM() : [];
	// 	let ifLen = measureProg(ifPart);
	// 	let elseLen = measureProg(elsePart);
	// 	return [...this.cond.SSM(), 'brf '+(ifLen+2), ...ifPart, 'bra '+elseLen, ...elsePart];
	// }
}
@ppNewLine
export class Block extends ParserRule{
	@SPL_Parser.addStep() 		content: BlockAcc | Stmt;
	lines() { return this.content instanceof Stmt ? [this.content] : this.content.lines; }
	// _getType not needed
	// SSM() {
	// 	return this.content.SSM();
	// }
}
@ppNewLine
export class BlockAcc extends ParserRule{
	@SPL_Parser.addIgnoreTokenStep( LexSPL.OpeningCurlyBracket )
			   .addOptStep() 	lines: Stmt[];
	@SPL_Parser.addIgnoreTokenStep( LexSPL.ClosingCurlyBracket )
	_: void;
	// _getType not needed
	// SSM() {
	// 	return this.lines.map(o => o.SSM()).reduce((p,c) => p.concat(c));
	// }
}
// let checkConditionBoolean = (ctx: T.Context, cond: Exp) => {
// 	if(!cond.getType(ctx).unifyWith(new T.BasicType(cond, false), T.ForceSealState.Nothing))
// 		throw cond.error("Condition is not boolean");
// }
@ppNewLine
export class While extends ParserRule{
	@SPL_Parser.addIgnoreTokenStep( LexSPL.While )
			   .addIgnoreTokenStep( LexSPL.OpeningParenthesis )
			   .addStep() 		cond: Exp;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.ClosingParenthesis )
			   .addStep() 		block: Block;
	// _getType(ctx: T.Context) : T.VoidType {
	// 	this.block.getType(ctx);
	// 	checkConditionBoolean(ctx, this.cond);
	// 	return new T.VoidType(this);
	// }
}

// let SSM_accessContext = ([n, level]: [number, number]) => {
// 	let ret = 'ldl 0';
// 	return new Array(level).fill([,]);
// };

@ppNewLine
export class Assign extends ParserRule{
	@SPL_Parser.addStep() 		ident: LexSPL.Id;
	@SPL_Parser.addOptStep() 	field?: Field;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.Equal )
			   .addStep() 		exp: Exp;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.Semicolon )
	_: void;
	private positionsGetter: Map<string, [number, number]>;
	// _getType(ctx: T.Context) : T.VoidType {
	// 	let result = getExpVarType(ctx, this.ident, this.field);
	// 	this.positionsGetter = result[1];

	// 	let typeVar = result[0];
	// 	let typeExp = this.exp.getType(ctx);

	// 	let tvVar = typeVar.extractVariableType();
	// 	let tvExp = typeExp.extractVariableType();
	// 	if((new Set([...tvVar, ...tvExp])).size != tvVar.length + tvExp.length)
	// 		throw this.error("Variable type circular reference detected");

	// 	if(!typeVar.unifyWith(typeExp, T.ForceSealState.Nothing))
	// 		throw this.error("Can't unify type "+typeVar.toString()+" and type "+typeExp.toString());

	// 	return new T.VoidType(this);
	// }
	// SSM() : string[] {
	// 	let prog = this.exp.SSM();
	// 	let posDest = this.positionsGetter.get(this.ident.content);
	// 	if(!posDest)
	// 		throw "Internal error - assigment not possible, position cannot be recovered";
	// 	let [n, level] = posDest;
	// 	if(this.field){
	// 		level && prog.push('ldl 1');
	// 		for(let i = 0; i < level - 1; i++)
	// 			prog.push('lda 1');
	// 		prog.push((level ? 'lda ' : 'ldl ')+n);
	// 		prog.push(...this.field.SSM());
	// 	}else{
	// 		level>0 && prog.push('ldrr RR MP'); // MP -> RR
	// 		for(let i = 0; i < level; i++)
	// 			prog.push('ldl 1', 'str MP');
	// 		prog.push('stl '+n);
	// 		level>0 && prog.push('ldrr MP RR'); // RR -> MP
	// 	}
	// 	return prog;
	// }
}
export class Call extends ParserRule{
	@SPL_Parser.addStep() 		call: FunCall;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.Semicolon )
	_: void;
	// _getType not needed
	// SSM() {
	// 	return this.call.SSM();
	// }
}
@ppNewLine
export class Ret extends ParserRule{
	@SPL_Parser.addIgnoreTokenStep( LexSPL.Return )
			   .addOptStep()	exp?: Exp;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.Semicolon )
	_: void;
	// _getType(ctx: T.Context) : T.Type{
	// 	return this.exp ? this.exp.getType(ctx) : new T.VoidType(this);
	// }
	// SSM () {
	// 	if(this.exp)
	// 		return [...this.exp.SSM(), 'str RR', 'unlink', 'ret'];
	// 	return ['unlink', 'ret'];
	// }
}
@ppNewLine
@ppIdent
export class Stmt extends ParserRule {
	@SPL_Parser.addStep() 		content: Assign | If | While | Call | Ret;
	// _getType not needed
	// SSM() {
	// 	return this.content.SSM();
	// }
}


// let getExpVarType = (ctx: T.Context, ident: LexSPL.Id, field?: Field) : [T.Type, Map<string, [number, number]>] => {
// 	let type = ctx.get(ident.content);
// 	let positionGetter = ctx.getPositionsGetter();
// 	if(!type){
// 		console.log(ctx);
// 		throw ident.error("Cannot find name "+ident.content+" in context "+ctx.toString());
// 	}
// 	if(type instanceof T.FunctionType)
// 		throw ident.error(ident.content + " is a function");
// 	let fieldPath = field ? field.getFieldsList() : [];
// 	let getFieldsStr = (k:number) => [ident.content, ...fieldPath.slice(0,k).map(o => o.content)].join('.');
// 	for(let [k,f] of fieldPath.entries())
// 		if(['fst','snd'].includes(f.content)){
// 			if(!(type instanceof T.TupleType))
// 				throw f.error(getFieldsStr(k-1)+ ' not a tuple');
// 			type = f.content=='fst' ? type.left : type.right;
// 		}else{
// 			if(!(type instanceof T.ListType))
// 				throw f.error(getFieldsStr(k-1)+ ' not a list');
// 			type = f.content=='hd' ? type.inner : type;
// 		}
// 	return [type, positionGetter];
// }

export class ExpVar extends ParserRule {
	@SPL_Parser.addStep() 		ident: LexSPL.Id;
	@SPL_Parser.addOptStep()	field?: Field;
	private positionsGetter: Map<string, [number, number]>;
	getFieldsList() : LexSPL.FieldOperators[] {
		return this.field ? this.field.getFieldsList() : [];
	}
	// _getType(ctx: T.Context) : T.Type {
	// 	let r = getExpVarType(ctx, this.ident, this.field);
	// 	this.positionsGetter = r[1];
	// 	return r[0];
	// }
	// SSM() : string[] {
	// 	let prog = [];
	// 	let o = this.positionsGetter.get(this.ident.content);
	// 	if(!o)
	// 		throw "Internal error - get var (in ExpVar) not possible, position cannot be recovered";
	// 	let [n, level] = o;

	// 	level && prog.push('ldl 1');
	// 	for(let i = 0; i < level - 1; i++)
	// 		prog.push('lda 1');
	// 	prog.push((level ? 'lda ' : 'ldl ')+n);
		
	// 	return [...prog, ...this.field ? this.field.SSM() : []];
	// }
}
export class ExpOp2 extends FunCallLike {
	@SPL_Parser.addStep() 		left: ExpNOp2;
	@SPL_Parser.addStep() 		operator: LexSPL.BinaryOperator | LexSPL.UnaryOrBinaryOperator;
	@SPL_Parser.addStep() 		right: Exp;
	get inputs() : ParserRule[] {
		return [this.left, this.right];
	}
	get funName() : string {
		return this.operator.content;
	}
	// get funDefs() : T.FunctionType {
	// 	let defs = nativeFunctions[this.operator.content];
	// 	if(!defs)
	// 		throw "No native implementation found for "+this.operator.content;
	// 	return new T.FunctionType(this, defs);
	// };
}
export class ExpOp1 extends FunCallLike {
	@SPL_Parser.addStep() 		operator: LexSPL.UnaryOperator | LexSPL.UnaryOrBinaryOperator;
	@SPL_Parser.addStep() 		exp: Exp;
	get inputs() : ParserRule[] {
		return [this.exp];
	}
	get funName() : string {
		return "{op2:"+this.operator.content+"}";
	}
	// get funDefs() : T.FunctionType {
	// 	let ft = new T.FunctionType(this, [new T.FunDefType(this, [new T.BasicType(this, false)], new T.BasicType(this, false))]);
	// 	return ft;
	// };
}
export class ExpPar extends ParserRule{
	@SPL_Parser.addIgnoreTokenStep( LexSPL.OpeningParenthesis )
			   .addStep() 		exp: Exp;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.ClosingParenthesis )
	_: void;
	// _getType(ctx: T.Context) : T.Type {
	// 	return this.exp.getType(ctx);
	// }
	// SSM() : string[] {
	// 	return this.exp.SSM();
	// }
}
export class ExpTuple extends ParserRule{
	@SPL_Parser.addIgnoreTokenStep( LexSPL.OpeningParenthesis )
			   .addStep() 		left: Exp;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.Comma )
			   .addStep() 		right: Exp;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.ClosingParenthesis )
	_: void;
	// _getType(ctx: T.Context) : T.Type {
	// 	return new T.TupleType(this, this.left.getType(ctx), this.right.getType(ctx));
	// }
	// SSM() : string[] {
	// 	return [...this.right.SSM(), ...this.left.SSM(), 'stmh 2'];
	// }
}
export class Exp extends ParserRule{
	@SPL_Parser.addStep() 		content: ExpOp2 | ExpNOp2;
	// _getType(ctx: T.Context) : T.Type {
	// 	return this.content.getType(ctx);
	// }
	SSM() {
		return this.content.SSM();
	}
}
export class ListCst extends ParserRule{
	@SPL_Parser.addIgnoreTokenStep( LexSPL.OpeningBracket )
			   .addOptStep() 	content?: Exp;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.ClosingBracket )
	_: void;
	// _getType(ctx: T.Context) : T.Type {
	// 	return new T.ListType(this, this.content ? this.content.getType(ctx) : new T.VariableType(this, '????'));
	// }
	SSM() : string[] { // AddrNext Value
		return ['ldc 0', ...this.content ? this.content.SSM().concat(['stmh 2']) : []];
	}
}
export class ExpNOp2 extends ParserRule{
	@SPL_Parser.addStep() 		content: ExpOp1 | ExpPar | ExpTuple | LexSPL.Integer | LexSPL.Bool | FunCall | ListCst | ExpVar;
	// _getType(ctx: T.Context) : T.Type {
	// 	if(this.content instanceof ParserRule)
	// 		return this.content.getType(ctx);
	// 	return new T.BasicType(this, this.content instanceof LexSPL.Integer);
	// }
	SSM() {
		return	this.content instanceof LexSPL.Integer	? ['ldc '+this.content.content] : 
				this.content instanceof LexSPL.Bool		? ['ldc '+(+(this.content.content=='True'))]
														: this.content.SSM();
	}
}
export class Field extends ParserRule{
	@SPL_Parser.addIgnoreTokenStep( LexSPL.Dot )
			   .addStep() 		fieldName: LexSPL.FieldOperators;
	@SPL_Parser.addOptStep()	nextField?: Field;
	getFieldsList() : LexSPL.FieldOperators[] {
		return [this.fieldName, ...(this.nextField ? this.nextField.getFieldsList() : [])];
	}
	SSM() : string[] {	// tuple are Snd Fst 
		return [this.fieldName.content=='fst' || this.fieldName.content=='hd' ? 'lda 0' : 'lda -1', 
						...this.nextField ? this.nextField.SSM() : []]
	}
}
export class FunCall extends FunCallLike {
	@SPL_Parser.addStep()	 	name: LexSPL.Id;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.OpeningParenthesis )
			   .addOptStep() 	_args?: ActArgs;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.ClosingParenthesis )
	_: void;

	getArgs() : ParserRule[]{
		return this._args ? this._args.getArgs() : [];
	}
	get inputs() : ParserRule[] {
		return this.getArgs();
	}
	get funName() : string {
		return this.name.content;
	}
	// get funDefs() : T.FunctionType {
	// 	let o = this.ctx.get(this.name.content);
	// 	if(o === undefined)
	// 		throw this.error("Function "+this.name.content+" not found");
	// 	if(!(o instanceof T.FunctionType || o instanceof T.NotResolvedYet))
	// 		throw this.error(this.name.content+" is not a function");
	// 	return o;
	// };
	// SSM() : string[] {
	// 	if(this.typeDefinition instanceof Array)
	// 		throw "NOOOOP {TODO!}";
	// 	// if(this.typeDefinition.attachedNode instanceof FunDecl){
	// 	let name = (<any>this.typeDefinition.attachedNode).name;
	// 	if(name){
	// 		let args = this._args ? this._args.getArgs() : [];
	// 		let native = (<any>this.typeDefinition).native;
	// 		if(native)
	// 			return native(args);
	// 		let argsProgs = args.map(o => o.SSM()).reduce((p,c) => p.concat(c), []);
	// 		return [...argsProgs, 'bsr '+name.content, 'ajs -'+args.length, 'ldr RR'];
	// 	}
	// 	throw "NOOOOOOOOOOOOOOOOOOOOOP {SO STRANGE}";
	// }
}
export class ActArgsOpt extends ParserRule{
	@SPL_Parser.addIgnoreTokenStep( LexSPL.Comma )
			   .addStep() 		content: ActArgs;
}
export class ActArgs extends ParserRule{
	@SPL_Parser.addStep() 		exp: Exp;
	@SPL_Parser.addOptStep() 	next?: ActArgsOpt;
	getArgs() : ParserRule[]{
		return [this.exp, ...this.next ? this.next.content.getArgs() : []];
	}
}
