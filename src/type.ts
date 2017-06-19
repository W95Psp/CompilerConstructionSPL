import {Let, Tuple, Tuple3, CatTuple, flatten, filterUndef} from './tools';
import {ParserRule} from './parser';
import {Token} from './lexer';
import {Integer, Bool} from './spl.lexer';
import {FunDecl} from './spl.parser';


export type Replacement = [UnknownType|VariableType, Type];

export let applyReplacements = (o: Type, rl: Replacement[]) : Type => {
	let res = rl.reduce((p,c) => p.replace(c[0], c[1]), o);
	return res;
};

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

export enum TypeStorage{ Normal, Reference }

export class Context{
	identifiers: Map<string, [ParserRule, number, TypeStorage]> = new Map();
	variableType: Map<string, Type> = new Map();
	protected typeSPR: TypeSetParserRule;

	standartLibrary: Map<string, [Type, (..._: Type[]) => string[][]]> = new Map();

	outsideVariables: Set<string> = new Set();
	cacheTypeParserRules: Map<ParserRule, [Type, Context] | undefined>;

	parent?: Context;
	numArgs: number = 0;

	attachedParserRule: ParserRule;

	constructor(attachedParserRule: ParserRule, typeSPR: TypeSetParserRule, std:Map<string, [Type, (..._: Type[]) => string[][]]>, parent?: Context, cacheTypeParserRules?: Map<ParserRule, [Type, Context] | undefined>){
		this.attachedParserRule = attachedParserRule;
		this.standartLibrary = std;
		this.typeSPR = typeSPR;
		this.parent = parent;
		this.cacheTypeParserRules = cacheTypeParserRules || new Map();
	}
	maxPositionOf (typeStorage: TypeStorage) {
		return [...this.identifiers.values()]
								.filter(([,i,ts]) => i>=0 && ts==typeStorage)
								.reduce((n,[,i,]) => Math.max(i), -1)+1;
	}
	maxPositionOfAll () {
		return [...this.identifiers.values()]
								.filter(([,i,ts]) => i>=0)
								.reduce((n,[,i,]) => Math.max(i), -1)+1;
	}
	getValue(id: string, from: ParserRule){
		let r = this.getValue_raw(id, from);
		return r ? r[0] : undefined;
	}
	getValue_raw(id: string, from: ParserRule){
		let ctx = this.getStrictContextOf(true, id);
		if(!ctx){
			if(this.standartLibrary.has(id)){
				let fake = new ParserRule();
				(<any>fake)._stdlib = true;
				(<any>fake)._stdlibName = id;
				return Tuple3(fake, -Infinity, TypeStorage.Normal);
			}
			return undefined;
		}
		let r = ctx.identifiers.get(id);
		if(ctx != this){
			this.outsideVariables.add(id);
			if(r && r[2]==TypeStorage.Normal)
				ctx.identifiers.set(id, [r[0], r[1], TypeStorage.Reference]);
		}
		return r;
	}
	getValuePosition(id: string, from: ParserRule){
		let r = this.getValue_raw(id, from);
		let ctx = this.getStrictContextOf(true, id);
		if(!r || !ctx)
			throw "Cannot fetch variable "+id;
		let [rule, num, storage] = r;
		if(num==Infinity)
			return Infinity;
		if(ctx==this){ // either local either param (=local, kind of)
			// we make some room for outside variables !
			return num>=0 ? num + 2 /* MP and PC */ : num - this.outsideVariables.size /*  */;
		}else{ // external scope value
			return [...this.outsideVariables].indexOf(id) - this.outsideVariables.size; // nth inserted value
		}
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
	declareValue(id: string, v: ParserRule, typeStorage: TypeStorage = TypeStorage.Normal, order?: number, type?: Type){
		let cOrder = order!==undefined ? order : this.maxPositionOfAll();

		if(cOrder<0 && !this.identifiers.has(id))
			this.numArgs++;
		this.identifiers.set(id, [v, cOrder, typeStorage]);
		if(type)
			this.cacheTypeParserRules.set(v, [type, this]);
	}

	getVType(id: string){						return this.variableType.get(id);				}
	declareVType(id: string, t:Type){			this.variableType.set(id,t);					}

	typeOf(o: ParserRule) : [Type, Context] | undefined{
		if((<any>o)._stdlib){
			let x = this.standartLibrary.get((<any>o)._stdlibName);
			if(!x)
				throw "Internal error: non typed standart lib";
			return Tuple(x[0], this); // create fake tuple
		}
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
		// if(toType instanceof IntegerType)
		// 	debugger;
		// if(!ctx)
		// 	throw "Cannot find variable type named \""+fromType.name+"\"";
		if(!ctx){
			// return;
			let gParent = (o:Context) : Context => o.parent ? gParent(o.parent) : o;
			ctx = gParent(this);
		}
		let applyToSub = (o: Context | ParserRule, force=false) : void => {
			if(force || !(o instanceof Context && o.getVType(fromType.name))){
				if(o instanceof ParserRule) {
					let r = this.cacheTypeParserRules.get(o);
					if(r){
						let [type, context] = r;
						// if((<any>o).name && (<any>o).name.content=='foldl')
						// 	return;
						if(o instanceof Context && context!=o)
							applyToSub(context);
						this.cacheTypeParserRules.set(o, Tuple(applyReplacements(type, [[fromType, toType]]), context));
					}
				}
				// if(o instanceof Context){
				// 	if((fromType instanceof VariableType || fromType instanceof UnknownType) && [...o.variableType.keys()].includes(fromType.name)){
				// 		return;
				// 	}
				// }
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
		return this.parent ? this.parent.getStrictContextOf(isValue, id) : undefined;
	}
	child(attachedParserRule: ParserRule, ...localVTypes: string[]){
		localVTypes.forEach(tname => this.declareVType(tname, new UnknownType(tname)));
		return new Context(attachedParserRule, this.typeSPR, this.standartLibrary, this, this.cacheTypeParserRules);
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
	internalUnifyWith(type: Type, instanciateVT?: Boolean) : ErrorUnifying | Replacement[]{
		if(!((<any>this) instanceof UnknownType) && type instanceof UnknownType)
			return type.internalUnifyWith(this, instanciateVT);
		if(instanciateVT && !(((<any>this) instanceof VariableType || (<any>this) instanceof UnknownType)) && type instanceof VariableType)
			return type.internalUnifyWith(this, instanciateVT);
		return this.internalUnifyWith_sub(type, instanciateVT);
	}; //If 'this' is more specialized than 'type', undefined
	abstract internalUnifyWith_sub(type: Type, instanciateVT?: Boolean) : ErrorUnifying | Replacement[]; //If 'this' is more specialized than 'type', undefined
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
	toString() {
		return this.constructor.name + this.inside ? ('{'+this.inside.map(o => o.toString()).join(' ; ')+'}') : '';
	}
	constructor(...inside: Type[]){
		super();
		this.inside.push(...inside);
	}
	search(f: (_: Type) => boolean) : Type[]{
		return [...f(this) ? [this] : [], ...flatten(this.inside.map(o => o.search(f)))];
	}
	internalUnifyWith_sub(type: Type, instanciateVT=false) : ErrorUnifying | Replacement[] {
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
	toString() {
		return '('+this.inside.map(o => o.toString()).join(', ')+')';
	}
	constructor(left: Type, right: Type){
		super(left, right);
	}
}
export class ListType extends CombinedType {
	toString() {
		return '['+this.inside.map(o => o.toString()).join('')+']';
	}
	constructor(inner: Type){
		super(inner);
	}
}
class FunctionType_UnderlyingType extends CombinedType {}

export class FunctionType extends Type {
	toString() {
		return this.inputs.map(o => o.toString()).join(' ')+' -> '+this.output.toString();
	}
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
	internalUnifyWith_sub(type: Type, instanciateVT=false) : ErrorUnifying | Replacement[]{
		this.outputErrorFlag = false;
		if(type instanceof UnknownType)
			return type.internalUnifyWith(this);
		if(!(type instanceof FunctionType))
			return new ErrorUnifying(this, type, 'Not FunctionType');
		// first: get replacements for inputs, apply them on outputs
		let rps = type.ctInputs.internalUnifyWith(this.ctInputs, instanciateVT);
		if(rps instanceof ErrorUnifying)
			return rps.comesFrom(this, type);
		let out = applyReplacements(type.output, rps);
		// if(out.equal(type.output) && type.output.lexOrder()[0] != Infinity)
		// 	return new ErrorUnifying(this, type, 'Wasn\'t able to figure out the type');
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
	toString() {
		return '?'+this.name;
	}
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
	internalUnifyWith_sub(type: Type, instanciateVT=false) : ErrorUnifying | Replacement[] {
		if(type.equal(this))
			return [];
		return [[this, type]];
	}
}
export class UnknownTypeLimited extends UnknownType {
	toString() {
		return '?'+this.name+':{'+this.possibles.map(o => o.toString()).join(' ; ')+'}';
	}
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
	internalUnifyWith_sub(type: Type, instanciateVT=false) : ErrorUnifying | Replacement[] {
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
			let replacers = this.possibles.map(possible => ({possible, replacers: <Replacement[]>possible.internalUnifyWith_sub(type)})).filter(o => o.replacers).pop();
			if(!replacers)
				return new ErrorUnifying(this, type);
			return [[this, replacers.possible], ...replacers.replacers]
		}
		throw "Should not be here";
	}
}

export class VariableType extends Type {
	toString() {
		return 'VT:'+this.name+':{'+this.possibles.map(o => o.toString()).join(' ; ')+'}';
	}
	lexOrder(){ return Tuple(1, this.possibles.length); }
	readonly possibles: CombinedType[];
	readonly name: string;
	search(f: (_: Type) => boolean) : Type[]{
		return [...flatten(this.possibles.map(o => o.search(f))), ...f(this) ? [this] : []];
	}
	constructor(possibles: CombinedType[], name?: string){
		super();
		if(name)
			this.name = name//+(idCounter++);
		else
			this.name = 'v'+(idCounter++);
		this.possibles = possibles;
	}
	equal(type: Type) : boolean {
		return (type instanceof VariableType) && this.name==type.name;
	}
	replace(needle: Type, replace: Type) : Type {
		return this.equal(needle) ? replace : this;
	}
	internalUnifyWith_sub(type: Type, instanciateVT=false) : ErrorUnifying | Replacement[] {
		if(instanciateVT){
			if(this.possibles.length){
				let o = this.possibles.find(x => x.internalUnifyWith_sub(type) instanceof Array);
				if(!o)
					return new ErrorUnifying(this, type);
			}
			if(type instanceof UnknownType)
				return [];
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
		// let result = this.possibles.map((o, i) => o.internalUnifyWith_sub(type) || [undefined]).reduce((p, c) => p.concat(c), <(undefined | Replacement)[]>[]);
		// if(result.some(o => !o))
		// 	return undefined;
		return allReplacers;
	}
}