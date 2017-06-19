import {Token, EOF, DeterministicToken} from './lexer';
import * as LexSPL from './spl.lexer';
import * as T from './type';
import {Let, SimpleTree, flatten, filterUndef} from './tools';
import {ParserRule, Parser, ppIdent, ppNewLine, ppPutVal} from './parser';

export class SPL_Parser extends Parser {}


export abstract class FunCallLike extends ParserRule {
	abstract get inputs() : ParserRule[];
	abstract get funName() : string;
}

export class SPL extends ParserRule{
	@SPL_Parser.addOptStep() 		decls: Decl[];
	@SPL_Parser.addStep() 		_eof: EOF;
	get lines () {return this.decls.map(o => o.content)}
	get variables () { return <VarDecl[]>this.lines.filter(o => o instanceof VarDecl) }
	get functions () { return <FunDecl[]>this.lines.filter(o => o instanceof FunDecl) }
}
export class Decl extends ParserRule{
	@SPL_Parser.addStep() 		content: (VarDecl | FunDecl);
	get name() { return this.content.name; }
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
}

export class VarOrFunDecl extends ParserRule{
	@SPL_Parser.addStep() 		content: (VarDecl | FunDecl);
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
	get argsParserRules() {
		if(!this._args) return [];
		return this._args.argsParserRules;
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
}
export class RetType extends ParserRule{
	@SPL_Parser.addStep() 		type: Type | LexSPL.Void;
}
export class FunType extends ParserRule{
	@SPL_Parser.addOptStep() 	inputs: Type[];
	@SPL_Parser.addIgnoreTokenStep( LexSPL.Arrow )
			   .addStep() 		output: RetType;
}
export class TupleType extends ParserRule{
	@SPL_Parser.addIgnoreTokenStep( LexSPL.OpeningParenthesis )
			   .addStep() 		left: Type;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.Comma )
			   .addStep() 		right: Type;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.ClosingParenthesis )
	_: void;
}
export class ListType extends ParserRule{
	@SPL_Parser.addIgnoreTokenStep( LexSPL.OpeningBracket )
			   .addStep() 		type: Type;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.ClosingBracket )
	_: void;
}
export class Type extends ParserRule{
	@SPL_Parser.addStep() 		type: LexSPL.BasicType | LambdaType | VarType | TupleType | ListType | LexSPL.Id;
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
	get argsParserRules() : (FArgsOpt | FArgs)[] {
		return [...this._args.map(o => o), this];
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
}
@ppNewLine
export class Block extends ParserRule{
	@SPL_Parser.addStep() 		content: BlockAcc | Stmt;
	lines() { return this.content instanceof Stmt ? [this.content] : this.content.lines; }
}
@ppNewLine
export class BlockAcc extends ParserRule{
	@SPL_Parser.addIgnoreTokenStep( LexSPL.OpeningCurlyBracket )
			   .addOptStep() 	lines: Stmt[];
	@SPL_Parser.addIgnoreTokenStep( LexSPL.ClosingCurlyBracket )
	_: void;
}

@ppNewLine
export class While extends ParserRule{
	@SPL_Parser.addIgnoreTokenStep( LexSPL.While )
			   .addIgnoreTokenStep( LexSPL.OpeningParenthesis )
			   .addStep() 		cond: Exp;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.ClosingParenthesis )
			   .addStep() 		block: Block;
}


@ppNewLine
export class Assign extends ParserRule{
	@SPL_Parser.addStep() 		ident: LexSPL.Id;
	@SPL_Parser.addOptStep() 	field?: Field;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.Equal )
			   .addStep() 		exp: Exp;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.Semicolon )
	_: void;
	private positionsGetter: Map<string, [number, number]>;
}
export class Call extends ParserRule{
	@SPL_Parser.addStep() 		call: FunCall;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.Semicolon )
	_: void;
}
@ppNewLine
export class Ret extends ParserRule{
	@SPL_Parser.addIgnoreTokenStep( LexSPL.Return )
			   .addOptStep()	exp?: Exp;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.Semicolon )
	_: void;
}
@ppNewLine
@ppIdent
export class Stmt extends ParserRule {
	@SPL_Parser.addStep() 		content: Assign | If | While | Call | Ret;
}



export class ExpVar extends ParserRule {
	@SPL_Parser.addStep() 		ident: LexSPL.Id;
	@SPL_Parser.addOptStep()	field?: Field;
	private positionsGetter: Map<string, [number, number]>;
	getFieldsList() : LexSPL.FieldOperators[] {
		return this.field ? this.field.getFieldsList() : [];
	}
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
}
export class ExpPar extends ParserRule{
	@SPL_Parser.addIgnoreTokenStep( LexSPL.OpeningParenthesis )
			   .addStep() 		exp: Exp;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.ClosingParenthesis )
	_: void;
}
export class ExpTuple extends ParserRule{
	@SPL_Parser.addIgnoreTokenStep( LexSPL.OpeningParenthesis )
			   .addStep() 		left: Exp;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.Comma )
			   .addStep() 		right: Exp;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.ClosingParenthesis )
	_: void;
}
export class Exp extends ParserRule{
	@SPL_Parser.addStep() 		content: ExpOp2 | ExpNOp2;
}
export class ListCst extends ParserRule{
	@SPL_Parser.addIgnoreTokenStep( LexSPL.OpeningBracket )
			   .addOptStep() 	content?: Exp;
	@SPL_Parser.addIgnoreTokenStep( LexSPL.ClosingBracket )
	_: void;
}
export class ExpNOp2 extends ParserRule{
	@SPL_Parser.addStep() 		content: ExpOp1 | ExpPar | ExpTuple | LexSPL.Integer | LexSPL.Bool | FunCall | ListCst | ExpVar;
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
