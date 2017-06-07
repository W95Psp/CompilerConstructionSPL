export interface Predicate<L>{ (o: any): o is L; }
export let Let = <T,K>(v: T, exp: (_:T)=>K) => exp(v);
export let rnd = (a:number,b:number) => Math.floor(Math.random()*(b-a+1)+a);
export let escapeRegExp = (str: string) => str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
export let isChildOf = <T extends Function>(A: any, parent: T) : A is T => Let(Object.getPrototypeOf(A), s => !!A.name && (parent==s || isChildOf(s, parent)));
export let print = <T>(o: T) => Let(console.log(o),_=>o);

export let flatten = <T>(l: T[][]) => l.length ? l.reduce((p, c) => p.concat(c), []) : [];
export let filterUndef = <T>(l: (T|undefined)[]) => <T[]>l.filter(o => o!==undefined);

declare global {
	interface Array<T> {
		// map until condition is true
		mapUntilUnified<K>(mapFun: ((_:T) => K), condition: ((_:K) => boolean)): K[];
		mapUntil<K>(mapFun: ((_:T) => K), condition: ((_:K) => boolean)): {listNotMatching: K[], matchingItem: K | undefined};
		split<L,R,K>(this: (T|R)[], predicate: Predicate<L>, done: (_:L[], x:R[]) => K): K;
		duplicates<T>(this: T[]): [number, T][];
		getUniqueValues<T>(this: T[]): T[];
		fusion<A,B>(this: A[], w: B[]): [A,B][];
		getPairwise<T>(this: T[]) : [T,T][];
	}
}

export let Tuple = <T,L>(a: T, b: L) => <[T,L]>[a,b];
export let Tuple3 = <T,L,M>(a: T, b: L, c: M) => <[T,L,M]>[a,b,c];
export let CatTuple = <T,L,M>(a: T, [b,c]: [L,M]) => Tuple3(a,b,c);

let getDuplicates = <T>(list: T[]) : [[number, T][], T[]] => {
	let m = new Set<T>();
	let duplicates = [] as [number, T][];
	for(let [i,o] of list.entries())
		m.has(o) ? duplicates.push([i,o]) : m.add(o);
	return Tuple(duplicates, [...m.keys()]);
};

Array.prototype.split = function<L,R,K>(this: (L|R)[], predicate: Predicate<L>, done: (_:L[], x: R[]) => K){
	let l = <L[]>[], r = <R[]>[];
	this.forEach(o => (predicate(o) ? l.push(o) : r.push(o)));
	return done(l, r);
}
Array.prototype.mapUntilUnified = function<T, K>(this: T[], mapFun: ((_:T) => K), condition: ((_:K) => boolean)){
	return Let(this.mapUntil(mapFun, condition), o => o.matchingItem ? o.listNotMatching.concat(o.matchingItem) : o.listNotMatching);
}
Array.prototype.mapUntil = function<T, K>(this: T[], mapFun: ((_:T) => K), condition: ((_:K) => boolean)){
	let listNotMatching = <K[]>[];
	let matchingItem: K | undefined = undefined;
	for(let i=0; i < this.length && condition(matchingItem = mapFun(this[i])); i++){
		listNotMatching.push(matchingItem);
		matchingItem = undefined;
	}
	return {listNotMatching, matchingItem};
}
Array.prototype.duplicates = function<T>(this: T[]){return getDuplicates(this)[0];}
Array.prototype.getUniqueValues = function<T>(this: T[]){return getDuplicates(this)[1];}
Array.prototype.fusion = function<A,B>(this: A[], w: B[]): [A, B][]{
	if(this.length!=w.length)
		throw "Length dismatch";
	return this.map((o,i) => Tuple(o, w[i]));
}
Array.prototype.getPairwise = function<T>(this: T[]) : [T,T][]{
	return this.slice(1).fusion(this.slice(0, this.length-1));
}

for(let name of ['split', 'mapUntilUnified', 'mapUntil', 'duplicates', 'getUniqueValues', 'fusion', 'getPairwise'])
    Object.defineProperty(Array.prototype, name, {enumerable: false,value: (<any>Array.prototype)[name]});

export class SimpleTree<T> {
	data: Map<T, SimpleTree<T>> = new Map();
	constructor(...data: T[]){
		this.data = new Map(<[T, SimpleTree<T>][]>data.map(o => [o, new SimpleTree()]));
	}
	clone() {
		let T = new SimpleTree<T>();
		for(let [k,o] of this.data.entries())
			T.set(k,o.clone());
		return T;
	}
	has(key: T){ return this.data.has(key); }
	set(key: T, tree = new SimpleTree<T>()){ 
		let o = this.data.get(key);
		if(o)
			return o;
		tree = tree.clone();
		this.data.set(key, tree);
		return tree;
	}
	get keys(){ return [...this.data.keys()]; }
	merge(...trees: SimpleTree<T>[]) {
		trees.forEach(T => T.data.forEach((o,k) => this.set(k,o)));
	}
	get(key: T){
		return this.data.get(key);
	}
}

export class SimpleUniqueTree<T> {
	data: Map<T, SimpleUniqueTree<T>> = new Map();
	parents: SimpleUniqueTree<T>[] = [];
	getValueFor(st: SimpleUniqueTree<T>) : T|undefined {
		let x = [...this.data.entries()].find(([obj, tree]) => tree == st);
		if(!x)
			return undefined;
		return x[0];
	}
	getParents() : T[]{
		return filterUndef(flatten(this.parents.map(p => [...p.getParents(), this.getValueFor(p)])));
	}
	getRoot() : SimpleUniqueTree<T> {
		let p = this.parents[0];
		return p ? p.getRoot() : this;
	}
	addChild(t: T){
		let r = this.find(t) || new SimpleUniqueTree<T>();

		r.parents = [...new Set([...r.parents, this])];
		this.data.set(t, r);
		return r;
	}
	find(t: T){
		let root = this.getRoot();
		let find = (o: SimpleUniqueTree<T>) : SimpleUniqueTree<T> | undefined =>
			o.data.has(t) ? <SimpleUniqueTree<T>>o.data.get(t) : [...o.data.values()].map(o => find(o)).find(o => !!o);
		return find(root);
	}
	getOrderedItems() : T[] {
		let r = [...this.data.entries()].map(([obj, tree]) => Tuple(obj, tree.getOrderedItems()));
		return flatten(r.map(([o,l]) => [o, ...l]));
	}
}