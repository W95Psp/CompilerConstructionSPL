import {Let, Tuple, Tuple3, CatTuple, flatten, filterUndef} from './tools';
import {ParserRule} from './parser';
import {Token} from './lexer';
import {Integer, Bool} from './spl.lexer';
// import * as SPLParser from './spl.parser';
// import * as ReflectMetadata from 'reflect-metadata';

// export class Context {
// 	protected idents: Map<string, Type> = new Map();
// 	parent?: Context;
// 	functionSealed = false;
// 	protected numberArgs = 0;
// 	protected parentPositionsGetter?: Map<string, [number, number]>;
// 	sealFunctions() {
// 		this.functionSealed = true;
// 	}
// 	get(ident: string) : Type | undefined {
// 		return this.idents.get(ident) || (this.parent ? this.parent.get(ident) : undefined);
// 	}
// 	hasLocal(ident: string) {
// 		return this.idents.has(ident);
// 	}
// 	getTypes(){
// 		return [...this.idents.values()].map(o => o);
// 	}
// 	getPositionsGetter(){
// 		let vars = [...this.idents.entries()].filter(([name, o]) => !(o instanceof FunctionType));
// 		let map = new Map(<[string, [number, number]][]>vars.map(([name, decl], i) => {
// 			let position = vars.length - i - 1 - this.numberArgs;
// 			if(position >= 0)
// 				position += 1; // skip previous MP and ref to parent context
// 			else{
// 				position = i - vars.length - 1; // skip return address
// 			}
// 			return [name, [position, 0]];
// 		}));
// 		if(this.parentPositionsGetter)
// 			for(let [key, [n, level]] of this.parentPositionsGetter)
// 				map.has(key) || map.set(key, [n, level + 1]);
// 		return map;
// 	}
// 	getLocalOrder(ident: string) : number {
// 		let vars = [...this.idents.entries()].filter(([name, o]) => !(o instanceof FunctionType));
// 		let i = vars.findIndex(([name, o]) => name == ident);
// 		if(i==-1)
// 			throw "XXX";
// 		return vars.length - i - 2;
// 		// return this.idents.get(ident) || (this.parent ? this.parent.get(ident) : undefined);
// 	}
// 	set(ident: string, type: Type, isArg = false) {
// 		(this.getContext(ident) || this).idents.set(ident, type);
// 		this.numberArgs += +isArg;
// 	}
// 	private getContext(ident: string) : Context | undefined {
// 		return this.idents.has(ident) ? this : (this.parent ? this.parent.getContext(ident) : undefined);
// 	}
// 	constructor(parent?: Context){
// 		this.parent = parent;
// 		if(this.parent)
// 			this.parentPositionsGetter = this.parent.getPositionsGetter();
// 	}
// 	child(){
// 		return new Context(this);
// 	}

// 	HP: number;
// 	SP: number;
// }

// interface TypeChecker {
// 	(c: ParserRule): boolean
// }
// let f:TypeChecker = (c: FunCall) => true;

// Reflect.getMetadata("design:type", f);


export type Replacement = [UnknownType|VariableType, Type];

export let applyReplacements = (o: Type, rl: Replacement[]) : Type => {
	let res = rl.reduce((p,c) => p.replace(c[0], c[1]), o);
	return res;
};

// last boolean means ""
type TypeRule = (o: ParserRule, getType: (_:ParserRule|Token) => Type, ctx: Context) => [Type|undefined, Context|undefined, Replacement[]];
let emptyTypeRule:TypeRule = (a,b,ctx) => [,, []];

export class TypeSetParserRule {
	typeRules: Map<typeof ParserRule, TypeRule>;
	typeTokens: Map<typeof Token, Type> = new Map([
		[Integer, new IntegerType()],
		[Bool, new BooleanType()]
	]);
	typeOf(o: ParserRule, ctx: Context) : [Type, Context] | undefined {
		let gt = (_:ParserRule|Token) => {
			if(_ instanceof Token){
				let r = this.typeTokens.get(<any>_.constructor);
				if(!r) throw _.error("Token not typable");
				return r;
			}
			let r = ctx.typeOf(_);
			let ob = r ? (r instanceof Context ? undefined : r) : r;
			let getPName = () => o.getMapFromValuesToKeys().get(_) || '?';
			if(!ob)
				throw _.error("Try to get not existing type {"+o.static.name+":"+getPName()+"}");
			return ob[0];
		};
		let f = (this.typeRules.get(o.static) || emptyTypeRule);
		let [computedValue, computedContext = ctx, rps] = f(o, gt, ctx);
		ctx.applyReplacements(rps);
		o.getValuesDirectFlat().forEach(sub => computedContext.typeOf(sub)); // may fail
		return computedValue ? Tuple(computedValue, computedContext) : undefined;
	}
	constructor(...typeRules: [typeof ParserRule, TypeRule][]){
		this.typeRules = new Map(typeRules);
	}
}

enum TypeStorage{ Normal, Reference }

export class Context{
	protected identifiers: Map<string, [ParserRule, number, TypeStorage]> = new Map();
	protected variableType: Map<string, Type> = new Map();
	protected typeSPR: TypeSetParserRule;

	protected outsideVariables: Set<string> = new Set();
	cacheTypeParserRules: Map<ParserRule, [Type, Context] | undefined>;

	protected parent?: Context;

	protected attachedParserRule: ParserRule;

	constructor(attachedParserRule: ParserRule, typeSPR: TypeSetParserRule, parent?: Context, cacheTypeParserRules?: Map<ParserRule, [Type, Context] | undefined>){
		this.attachedParserRule = attachedParserRule;
		this.typeSPR = typeSPR;
		this.parent = parent;
		this.cacheTypeParserRules = cacheTypeParserRules || new Map();
	}

	getValue(id: string, from: ParserRule){
		let ctx = this.getStrictContextOf(true, id);
		if(!ctx)
			return undefined;
		if(ctx != this)
			this.outsideVariables.add(id);
		let r = ctx.identifiers.get(id);
		return r ? r[0] : undefined;
		// return (<[ParserRule, number, TypeStorage]>ctx.identifiers.get(id))[0];
	}
	setValue(id: string, v: ParserRule){
		this.getContextOf(true,id).setLocalValue(id, v);
	}
	hasLocalValue(id: string){					return this.identifiers.has(id);				}
	setLocalValue(id: string, v: ParserRule){
		let o = this.identifiers.get(id);
		if(!o)
			throw "No value linked to the name "+v;
		let [decl, position, typeStorage] = o;
		this.identifiers.set(id, [v, position, typeStorage]);
	}
	declareValue(id: string, v: ParserRule, typeStorage: TypeStorage = TypeStorage.Normal, order?: number){
		let cOrder = order!==undefined ? order : [...this.identifiers.values()]
						.filter(([,i,ts]) => i>=0 && ts==typeStorage)
						.reduce((n,[,i,]) => Math.max(i), -1)+1;
		this.identifiers.set(id, [v, cOrder, typeStorage]);
	}

	getVType(id: string){						return this.variableType.get(id);				}
	declareVType(id: string, t:Type){			this.variableType.set(id,t);					}

	typeOf(o: ParserRule) : [Type, Context] | undefined{
		if(this.cacheTypeParserRules.has(o))
			return this.cacheTypeParserRules.get(o);
		let r = this.typeSPR.typeOf(o, this);
		this.cacheTypeParserRules.set(o, r);
		return r;
	}

	applyReplacements(rs: Replacement[]){
		for(let r of rs)
			this.applyReplacement(r);
	}
	applyReplacement([fromType, toType]: Replacement){
		let ctx = this.getStrictContextOf(false, fromType.name);
		// if(!ctx)
		// 	throw "Cannot find variable type named \""+fromType.name+"\"";
		if(!ctx){
			let gParent = (o:Context) : Context => o.parent ? gParent(o.parent) : o;
			ctx = gParent(this);
		}
		let applyToSub = (o: Context | ParserRule, force=false) : void => {
			if(force || !(o instanceof Context && o.getVType(fromType.name))){
				if(o instanceof ParserRule) {
					let r = this.cacheTypeParserRules.get(o);
					if(r){
						let [type, context] = r;
						if(o instanceof Context && context!=o)
							applyToSub(context);
						this.cacheTypeParserRules.set(o, Tuple(applyReplacements(type, [[fromType, toType]]), context));
					}
				}
				(o instanceof Context ? o.attachedParserRule : o)
					.getValuesDirectFlat().forEach(v => applyToSub(v));
			}
		};
		applyToSub(ctx, true);
		for(let [k,v] of this.variableType.entries())
			this.variableType.set(k, applyReplacements(v, [[fromType, toType]]));
	}

	getContextOf(isValue: boolean, id: string) : Context{
		return this.getStrictContextOf(isValue, id) || this;
	}
	getStrictContextOf(isValue: boolean, id: string) : Context | undefined{
		if((isValue ? this.identifiers : this.variableType).has(id))
			return this;
		return this.parent ? this.parent.getContextOf(isValue, id) : undefined;
	}
	child(attachedParserRule: ParserRule, ...localVTypes: string[]){
		localVTypes.forEach(tname => this.declareVType(tname, new UnknownType(tname)));
		return new Context(attachedParserRule, this.typeSPR, this, this.cacheTypeParserRules);
	}
}


let ordLexOrder = ([a1,a2]: [number, number], [b1,b2]: [number, number]) => 
	a1==b1 && a2==b2 ? 0 : (a1 > b1 || (a1==b1 && a2 < b2)) ? 1 : -1;
let maxLexOrder = (a: [number, number], b: [number, number]) =>
	ordLexOrder(a,b)>0 ? a : b;
let maxsLexOrder = (l: [number, number][]) => {
	if(!l.length)
		return Tuple(Infinity, 1);
	return l.reduce((p, c) => maxLexOrder(p,c), l[0]);
};
let incrLexOrder = ([a,b]: [number, number]) => Tuple(a+1, b);

export class ErrorUnifying{
	path: [Type, Type, string|undefined][] = [];
	constructor(from: Type, to: Type, message:string|undefined=undefined){
		this.comesFrom(from, to, message);
	}
	comesFrom(from: Type, to: Type, message:string|undefined=undefined){
		this.path.push([from, to, message]);
		return this;
	}
};

export abstract class Type {
	//instanciateVT is used on function calls
	abstract internalUnifyWith(type: Type, instanciateVT?: Boolean) : ErrorUnifying | Replacement[]; //If 'this' is more specialized than 'type', undefined
																		//else return replacements to make this like type
	unifyWith(type: Type) {
		let rp = this.internalUnifyWith(type);
		return rp instanceof ErrorUnifying ? undefined : applyReplacements(this, rp);
	}
	// abstract extractVariableType(shallow?: boolean) : VariableType[];
	// abstract dependOnNotResolvedYet() : boolean;
	get cons_name() : string {
		return (<any>this).constructor.name;
	}
	abstract equal(type: Type) : boolean;
	abstract replace(needle: Type, replace: Type) : Type;
	abstract lexOrder() : [number, number];
	abstract search(f: (_: Type) => boolean): Type[];
}

let flattenFilterUndef = <T>(l: ((T[])|undefined)[]) => flatten(filterUndef(l));

export abstract class CombinedType extends Type {
	readonly inside: Type[] = [];
	constructor(...inside: Type[]){
		super();
		this.inside.push(...inside);
	}
	search(f: (_: Type) => boolean) : Type[]{
		return [...f(this) ? [this] : [], ...flatten(this.inside.map(o => o.search(f)))];
	}
	internalUnifyWith(type: Type, instanciateVT=false) : ErrorUnifying | Replacement[] {
		if(!(type instanceof CombinedType && this instanceof type.constructor) || this.inside.length != type.inside.length)
			return new ErrorUnifying(this, type, 'Not same kind of CombinedType (cannot unify '+this.cons_name+' and '+type.cons_name+')');

		let mapBef = flatten(this.inside.map((o,i) => Tuple(o, type.inside[i])).map(([a,b],i) => {
			let c =  a.internalUnifyWith(b, instanciateVT);
			if(c instanceof Array)
				return c.map(o => Tuple(i,o));
			return [];
		}))
		let map = new Map<UnknownType | VariableType, [number, Type]>();
		for(let [i,[m,d]] of mapBef){
			let o = map.get(m);
			if(!o)
				map.set(m, [i,d]);
			else{
				let [index, type] = o;
				map.set(m, ordLexOrder(type.lexOrder(), d.lexOrder())<0 ? o : [i,d]);
			}
		}
		let order = [...map.values()].map(([i]) => i);
		let list = [...order, ...this.inside.map((o,i) => i).filter(i => !order.includes(i))].map(i => Tuple(this.inside[i], type.inside[i]));

		let allReplacers = [];
		for(let [a, b] of list) {
			let replacers = a.internalUnifyWith(b, instanciateVT);
			if(replacers instanceof ErrorUnifying)
				return replacers.comesFrom(this, type);
			allReplacers.push(...replacers);
			for(let i in list)
				list[i] = [applyReplacements(list[i][0], replacers), list[i][1]];
		}
		return allReplacers;
	}
	lexOrder(){ return incrLexOrder(maxsLexOrder(this.inside.map(o => o.lexOrder()))); }
	replace(needle: Type, replace: Type) : Type {
		if(this.equal(needle))
			return replace;
		return new (<any>this.constructor)(...this.inside.map(o => o.replace(needle, replace)));
	}
	equal(type: Type) : type is CombinedType {
		return  (type instanceof CombinedType) && this.constructor == type.constructor
				&& this.inside.length == type.inside.length 
				&& this.inside.every((o, i) => o.equal(type.inside[i]));
	}
}
export class TupleType extends CombinedType {
	constructor(left: Type, right: Type){
		super(left, right);
	}
}
export class ListType extends CombinedType {
	constructor(inner: Type){
		super(inner);
	}
}
class FunctionType_UnderlyingType extends CombinedType {}

export class FunctionType extends Type {
	readonly inputs: Type[];
	readonly output: Type;
	readonly ctFull: CombinedType;
	readonly ctInputs: CombinedType;
	outputErrorFlag: boolean = false;
	search(f: (_: Type) => boolean) : Type[]{
		return [...this.ctFull.search(f), ...f(this) ? [this] : []];
	}
	lexOrder(){ return this.ctFull.lexOrder(); }
	constructor(inputs: Type[], output: Type){
		super();
		[this.inputs, this.output] = [inputs, output];
		this.ctFull = new FunctionType_UnderlyingType(...this.inputs, this.output);
		this.ctInputs = new FunctionType_UnderlyingType(...this.inputs);
	}
	internalUnifyWith(type: Type, instanciateVT=false) : ErrorUnifying | Replacement[]{
		this.outputErrorFlag = false;
		if(!(type instanceof FunctionType))
			return new ErrorUnifying(this, type, 'Not FunctionType');
		// first: get replacements for inputs, apply them on outputs
		let rps = type.ctInputs.internalUnifyWith(this.ctInputs, instanciateVT);
		if(rps instanceof ErrorUnifying)
			return rps.comesFrom(this, type);
		let out = applyReplacements(type.output, rps);
		if(out.equal(type.output) && type.output.lexOrder()[0] != Infinity)
			return new ErrorUnifying(this, type, 'Wasn\'t able to figure out the type');
		let unifiedOne = new FunctionType_UnderlyingType(...this.inputs, out);
		let rpsNew = this.ctFull.internalUnifyWith(unifiedOne, instanciateVT);
		if(rpsNew instanceof ErrorUnifying){
			this.outputErrorFlag = true;
			return rpsNew.comesFrom(this, type);
		}
		return [...new Set([...rps, ...rpsNew])];
	}
	equal(type: Type) : type is FunctionType {
		return this.ctFull.equal(type);
	}
	replace(needle: Type, replace: Type) : Type {
		if(this.equal(needle))
			return replace;
		return new FunctionType(
					this.inputs.map(o => o.replace(needle, replace)),
					this.output.replace(needle, replace)
				);
	}
}
export class IntegerType extends CombinedType {
	constructor(){super();}
}
export class BooleanType extends CombinedType {
	constructor(){super();}
}
let idCounter = 0;
export class UnknownType extends Type {
	search(f: (_: Type) => boolean) : Type[]{
		return f(this) ? [this] : [];
	}
	lexOrder(){ return Tuple(1, Infinity); }
	readonly name: string;
	constructor(name?: string){
		super();
		this.name = name || 'v'+(idCounter++);
	}
	equal(type: Type) : boolean{
		return (type instanceof UnknownType) && type.name == this.name;
	}
	replace(needle: Type, replace: Type) : Type {
		return this.equal(needle) ? replace : this;
	}
	internalUnifyWith(type: Type, instanciateVT=false) : ErrorUnifying | Replacement[] {
		if(type.equal(this))
			return [];
		return [[this, type]];
	}
}
export class UnknownTypeLimited extends UnknownType {
	lexOrder(){ return Tuple(1, this.possibles.length - 0.1); }
	readonly name: string;
	readonly possibles: Type[];
	
	search(f: (_: Type) => boolean) : Type[]{
		return [...flatten(this.possibles.map(o => o.search(f))), ...f(this) ? [this] : []];
	}
	constructor(possibles: Type[], name?: string){
		super(name);
		this.possibles = possibles;
	}
	internalUnifyWith(type: Type, instanciateVT=false) : ErrorUnifying | Replacement[] {
		if(type instanceof UnknownType)
			return [[this, type]];
		if(type instanceof UnknownTypeLimited){ // we want to take the types in common and 
			let replacers: Replacement[] = [];
			let intersection 	= this.possibles.filter(o => type.possibles.some(x => {
				let r = o.internalUnifyWith(x, instanciateVT);
				if(r instanceof ErrorUnifying)
					return false;
				replacers.push(...r);
				return true;
			}));	//intersection by internalUnifyWith
			if(!intersection.length)
				return new ErrorUnifying(this, type);
			intersection = intersection.map(o => applyReplacements(o, replacers));
			let	o		= new UnknownTypeLimited(intersection, this.name);
			return [[this, o], [type, o], ...replacers];
		}
		if(type instanceof VariableType){
			let err = <ErrorUnifying | undefined>flatten(this.possibles.map(i => type.possibles.map(j => Tuple(i,j)))).map(([i,j]) => i.internalUnifyWith(j)).find(o => o instanceof ErrorUnifying);
			if(err)
				return err.comesFrom(this, type);
			return [[this, type]];
		}
		if(type instanceof CombinedType){
			let replacers = this.possibles.map(possible => ({possible, replacers: <Replacement[]>possible.internalUnifyWith(type)})).filter(o => o.replacers).pop();
			if(!replacers)
				return new ErrorUnifying(this, type);
			return [[this, replacers.possible], ...replacers.replacers]
		}
		throw "Should not be here";
	}
}

export class VariableType extends Type {
	lexOrder(){ return Tuple(1, this.possibles.length); }
	readonly possibles: CombinedType[];
	readonly name: string;
	search(f: (_: Type) => boolean) : Type[]{
		return [...flatten(this.possibles.map(o => o.search(f))), ...f(this) ? [this] : []];
	}
	constructor(possibles: CombinedType[], name?: string){
		super();
		this.name = name || 'v'+(idCounter++);
		this.possibles = possibles;
	}
	equal(type: Type) : boolean {
		return (type instanceof VariableType) && this.name==type.name;
	}
	replace(needle: Type, replace: Type) : Type {
		return this.equal(needle) ? replace : this;
	}
	internalUnifyWith(type: Type, instanciateVT=false) : ErrorUnifying | Replacement[] {
		if(instanciateVT){
			if(this.possibles.some.length){
				let o = this.possibles.find(x => x.internalUnifyWith(type) instanceof Array);
				if(!o)
					return new ErrorUnifying(this, type);
			}
			return [[this, type]];
		}
		if(!(type instanceof VariableType) || type.possibles.length != this.possibles.length)
			return new ErrorUnifying(this, type);
		let list = this.possibles.map((o,i) => Tuple(o as Type, type.possibles[i]));
		let allReplacers = [];
		for(let [a, b] of list) {
			let replacers = a.internalUnifyWith(b, instanciateVT);
			if(replacers instanceof ErrorUnifying)
				return replacers.comesFrom(this, type);
			allReplacers.push(...replacers);
			for(let i in list)
				list[i] = Tuple(applyReplacements(list[i][0], replacers), list[i][1]);
		}
		// let result = this.possibles.map((o, i) => o.internalUnifyWith(type) || [undefined]).reduce((p, c) => p.concat(c), <(undefined | Replacement)[]>[]);
		// if(result.some(o => !o))
		// 	return undefined;
		return allReplacers;
	}
}