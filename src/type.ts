import {Let} from './tools';
import {ParserRule} from './parser';

export class Context {
	protected idents: Map<string, Type> = new Map();
	parent?: Context;
	functionSealed = false;
	protected numberArgs = 0;
	protected parentPositionsGetter?: Map<string, [number, number]>;
	sealFunctions() {
		this.functionSealed = true;
	}
	get(ident: string) : Type | undefined {
		return this.idents.get(ident) || (this.parent ? this.parent.get(ident) : undefined);
	}
	hasLocal(ident: string) {
		return this.idents.has(ident);
	}
	getTypes(){
		return [...this.idents.values()].map(o => o);
	}
	getPositionsGetter(){
		let vars = [...this.idents.entries()].filter(([name, o]) => !(o instanceof FunctionType));
		let map = new Map(<[string, [number, number]][]>vars.map(([name, decl], i) => {
			let position = vars.length - i - 1 - this.numberArgs;
			if(position >= 0)
				position += 1; // skip previous MP and ref to parent context
			else{
				position = i - vars.length - 1; // skip return address
			}
			return [name, [position, 0]];
		}));
		if(this.parentPositionsGetter)
			for(let [key, [n, level]] of this.parentPositionsGetter)
				map.has(key) || map.set(key, [n, level + 1]);
		return map;
	}
	getLocalOrder(ident: string) : number {
		let vars = [...this.idents.entries()].filter(([name, o]) => !(o instanceof FunctionType));
		let i = vars.findIndex(([name, o]) => name == ident);
		if(i==-1)
			throw "XXX";
		return vars.length - i - 2;
		// return this.idents.get(ident) || (this.parent ? this.parent.get(ident) : undefined);
	}
	set(ident: string, type: Type, isArg = false) {
		(this.getContext(ident) || this).idents.set(ident, type);
		this.numberArgs += +isArg;
	}
	private getContext(ident: string) : Context | undefined {
		return this.idents.has(ident) ? this : (this.parent ? this.parent.getContext(ident) : undefined);
	}
	constructor(parent?: Context){
		this.parent = parent;
		if(this.parent)
			this.parentPositionsGetter = this.parent.getPositionsGetter();
	}
	child(){
		return new Context(this);
	}

	HP: number;
	SP: number;
}

export enum ForceSealState {
	ActLikeItWasSealed,
	AvoidSeal,
	Nothing
}

export abstract class Type {
	attachedNode: ParserRule;
	abstract clone() : Type;
	constructor(attachedNode: ParserRule){
		this.attachedNode = attachedNode;
	}
	unifyWith(type: Type, forceSeal: ForceSealState) : boolean {
		if(type instanceof VariableType)
			return this._unifyWith(type, forceSeal) || type._unifyWith(this, ForceSealState.ActLikeItWasSealed);
		return this._unifyWith(type, forceSeal);
	};
	protected abstract _unifyWith(type: Type, forceSeal: ForceSealState) : boolean;
	abstract extractVariableType(shallow?: boolean) : VariableType[];
	abstract dependOnNotResolvedYet() : boolean;
}
export class BasicType extends Type {
	isInteger: boolean;
	clone(){return new BasicType(this.attachedNode, this.isInteger)};
	_unifyWith(type: Type, forceSeal: ForceSealState) : boolean{
		return (type instanceof BasicType) && this.isInteger==type.isInteger;
	}
	constructor(attachedNode: ParserRule, isInteger: boolean){
		super(attachedNode);
		this.isInteger = isInteger;
	}
	extractVariableType(shallow = false) {return []};
	toString(){
		return this.isInteger ? 'Integer' : 'Boolean';
	}
	dependOnNotResolvedYet(){return false};
}
export class VoidType extends Type {
	clone(){return new VoidType(this.attachedNode)};
	_unifyWith(type: Type, forceSeal: ForceSealState) : boolean{return (type instanceof VoidType);}
	constructor(attachedNode: ParserRule){super(attachedNode);}
	extractVariableType(shallow = false) {return []};
	toString(){
		return 'Void';
	}
	dependOnNotResolvedYet(){return false};
}
export abstract class ComposedType extends Type {}
export class TupleType extends ComposedType {
	left:	Type;
	right:	Type;
	clone(){return new TupleType(this.attachedNode, this.left.clone(), this.right.clone())};
	_unifyWith(type: Type, forceSeal: ForceSealState) : boolean{
		return (type instanceof TupleType) && this.left.unifyWith(type.left, forceSeal) && this.right.unifyWith(type.right, forceSeal);
	}
	constructor(attachedNode: ParserRule, left: Type, right: Type){
		super(attachedNode);
		this.left = left;
		this.right = right;
	}
	extractVariableType(shallow = false) {return [...this.left.extractVariableType(), ...this.right.extractVariableType()]};
	toString(){
		return '('+this.left.toString()+', '+this.right.toString()+']';
	}
	dependOnNotResolvedYet(){return this.left.dependOnNotResolvedYet() || this.right.dependOnNotResolvedYet()};
}
export class ListType extends ComposedType  {
	inner: Type;
	clone(){return new ListType(this.attachedNode, this.inner.clone())};
	_unifyWith(type: Type, forceSeal: ForceSealState) : boolean{
		return (type instanceof ListType) && this.inner.unifyWith(type.inner, forceSeal);
	}
	constructor(attachedNode: ParserRule, inner: Type){
		super(attachedNode);
		this.inner = inner;
	}
	extractVariableType(shallow = false) {return this.inner.extractVariableType()};
	toString(){
		return '['+this.inner.toString()+']';
	}
	dependOnNotResolvedYet(){return this.inner.dependOnNotResolvedYet()};
}
export class FunDefType extends ComposedType  {
	inputs: Type[];
	output: Type;
	native?: (_: ParserRule[]) => string[];
	clone(){return new FunDefType(this.attachedNode, this.inputs.map(o => o.clone()), this.output.clone(), this.native)};
	_unifyWith(type: Type, forceSeal: ForceSealState) : boolean{
		return (type instanceof FunDefType) 	&& this.inputs.length==type.inputs.length 
												&& this.output.unifyWith(type.output, forceSeal)
												&& this.inputs.every((t,k) => t.unifyWith(type.inputs[k], forceSeal));
	}
	getMark() : number {
		return this.inputs.filter(o => o instanceof VariableType).length;
	}
	getOutputType(inputs: Type[], avoidSeal = ForceSealState.Nothing) : Type | undefined {
		if(inputs.length != this.inputs.length)
			return undefined;
		if(inputs.some(o => o instanceof NotResolvedYet))
			return new NotResolvedYet(this.attachedNode);
		let i = this.inputs.map(o => o.clone());
		if(!i.every((i,k) => inputs[k].unifyWith(i, avoidSeal)))
			return undefined;
		let out = this.output;
		if(out instanceof VariableType){
			let oo = out;
			return inputs[i.findIndex(o => (o instanceof VariableType) && o.name==oo.name)];
		}
		return out.clone();
	}
	constructor(attachedNode: ParserRule, inputs: Type[], output: Type, native?: (_: ParserRule[]) => string[]){
		super(attachedNode);
		this.inputs = inputs;
		this.output = output;
		this.native = native;
	}
	extractVariableType(shallow = false) {return [...this.inputs, this.output].map(o => o.extractVariableType()).reduce((p, c) => p.concat(c), [])};
	toString(){
		return '( ' + this.inputs.map(i => i.toString()).join(', ') + ' -> '+ this.output.toString() +' )'
	}
	dependOnNotResolvedYet(){return false;};
}

let uniqueId = 0;
export class FunctionType extends ComposedType {
	funDefs: FunDefType[];
	clone(){
		return new FunctionType(this.attachedNode, this.funDefs.map(o => o.clone()));
	}
	_unifyWith(type: Type, forceSeal: ForceSealState) : boolean{
		(() => {throw "TODO uniftWith fun type"}).call(null);
		return false;
	}
	getBestFunction_len(inputs: Type[]) : FunDefType[] {
		let defs = this.funDefs.filter(o => o.inputs.length == inputs.length).sort((a, b) => Let([a.getMark(), b.getMark()], ([ma, mb]) => ma == mb ? 0 : (ma > mb ? 1 : -1)));
		if(!defs.length)
			throw "No overloading of "+this.attachedNode+" with "+inputs.length+" arguments exists";
		return defs;
	}
	getBestFunction(inputs: Type[]) : {funDef: FunDefType | FunDefType[], outputType: Type} {
		let defs = this.getBestFunction_len(inputs);
		let typeTrace = inputs.map(o => o.toString()).join(', ');
		let goodDefs = <{def: FunDefType, type: Type}[]>defs.map(def => ({def, type: def.getOutputType(inputs, ForceSealState.AvoidSeal)})).filter(o => o.type);
		inputs.forEach(d => d.extractVariableType(true).forEach(d => d.seal()));

		if(!goodDefs.length)
			throw this.attachedNode.error("No overloading of "+((<any>this.attachedNode).name || (<any>this.attachedNode).funName)+" with types "+typeTrace);
		if(goodDefs.length==1)
			return {outputType: goodDefs[0].type, funDef: goodDefs[0].def};

		let T = new VariableType(this.attachedNode, 't_'+(++uniqueId));
		let subTypes = goodDefs.map(o => o.def instanceof VariableType ? o.def.possibles : [o.def]).reduce((p, c) => p.concat(c));
		T.possibles = subTypes;

		return {outputType: T, funDef: goodDefs.map(o => o.def)};
	}
	getTypeDef(inputs: Type[]) : NotResolvedYet | FunDefType | FunDefType[] {
		if(this instanceof NotResolvedYet)
			return this;
		return this.getBestFunction(inputs).funDef;
	}
	getOutputType(inputs: Type[]) : Type {
		return this.getBestFunction(inputs).outputType;
	}
	constructor(attachedNode: ParserRule, funDefs: FunDefType[]){
		super(attachedNode);
		this.funDefs = funDefs;
	}
	extractVariableType(shallow = false) {return this.funDefs.map(o => o.extractVariableType()).reduce((p, c) => p.concat(c), [])};

	toString(){
		return '[Function either: ' + this.funDefs.map(d => d.toString()).join(', ') + ']';
	}
	dependOnNotResolvedYet(){return false;};
}
export class NotResolvedYet extends FunctionType {
	ressourceName: string;
	clone() { return new NotResolvedYet(this.attachedNode); }
	extractVariableType() {return <VariableType[]>[];}
	_unifyWith() {return true;}
	dependOnNotResolvedYet(){return false;};
	constructor(attachedNode: ParserRule){ super(attachedNode, []); }

	getTypeDef(_: Type[]) : NotResolvedYet {
		return this;
	}
	getOutputType(_: Type[]) : Type {
		return this;
	}
	toString(){
		return '[NotResolvedYet]';
	}
}
export class VariableType extends Type {
	private sealed:		boolean;
	possibles:	(BasicType | ComposedType)[] = [];
	id= 		Symbol();

	name: string;
	clone(){
		let o = new VariableType(this.attachedNode, this.name);
		o.possibles = this.possibles.map(o => o.clone());
		return o;
	};
	// DO NOT USE FOLLOWING (adaptembt to do, sealing thing)
	// unifyWithMultiple(types: Type[], forceSeal: ForceSealState) : boolean{
	// 	let result = types.every(type => this._unifyWithOne(type, forceSeal));
	// 	this.seal();
	// 	return result;
	// }
	_unifyWith(type: Type, forceSeal: ForceSealState) : boolean{
		let doNotSeal = forceSeal==ForceSealState.AvoidSeal;
		let result = this._unifyWithOne(type, doNotSeal ? ForceSealState.Nothing : forceSeal);
		debugger;
		doNotSeal || this.seal();
		debugger;
		return result;
	}
	_unifyWithOne(type: Type, forceSeal: ForceSealState) : boolean{
		if(type instanceof VariableType)
			return type.possibles.length == 0 || (this.possibles.length == type.possibles.length && this.possibles.every((p,k) => p.unifyWith(type.possibles[k], forceSeal)));
		let alreadyThere = this.possibles.some(o => o.unifyWith(type, ForceSealState.ActLikeItWasSealed));
		if(this.sealed || forceSeal==ForceSealState.ActLikeItWasSealed){
			if(this.possibles.length==0)
				return true;
			this.possibles = this.possibles.filter(o => o.unifyWith(type, ForceSealState.ActLikeItWasSealed));
			return alreadyThere;
		}else{
			if(!alreadyThere)
				this.possibles.push(type);
			return true;
		}
	}
	constructor(attachedNode: ParserRule, name: string){
		super(attachedNode);
		this.name = name;
	}
	seal(){
		this.sealed=true;
	}
	extractVariableType(shallow = false) {return shallow ? [this] : [this, ...this.possibles.map(o => o.extractVariableType()).reduce((p,c) => p.concat(c), [])]};

	toString(){
		if(this.possibles.length==0)
			return '[Variable Type '+this.name+']';
		if(this.possibles.length==1)
			return this.possibles[0].toString();
		return '[Either: '+this.possibles.map(o => o.toString()).join(', ')+']';
	}
	dependOnNotResolvedYet(){return this.possibles.some(o => o.dependOnNotResolvedYet());};
}