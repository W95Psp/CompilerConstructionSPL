export interface Predicate<L>{ (o: any): o is L; }
export let Let = <T,K>(v: T, exp: (_:T)=>K) => exp(v);
export let rnd = (a:number,b:number) => Math.floor(Math.random()*(b-a+1)+a);
export let escapeRegExp = (str: string) => str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
export let isChildOf = <T extends Function>(A: any, parent: T) : A is T => Let(Object.getPrototypeOf(A), s => !!A.name && (parent==s || isChildOf(s, parent)));
export let print = <T>(o: T) => Let(console.log(o),_=>o);

declare global {
	interface Array<T> {
		// map until condition is true
		mapUntilUnified<K>(mapFun: ((_:T) => K), condition: ((_:K) => boolean)): K[];
		mapUntil<K>(mapFun: ((_:T) => K), condition: ((_:K) => boolean)): {listNotMatching: K[], matchingItem: K | undefined};
		split<L,R,K>(this: (T|R)[], predicate: Predicate<L>, done: (_:L[], x:R[]) => K): K;
	}
}
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