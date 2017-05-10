import {Token, EOF} from './lexer';
import {ParserRule} from './parser';
import {Let, isChildOf} from './tools';

export class TokenDeck {
	private tokens: Token[];
	private index: number;
	 lastNotMatching?: {index: number, rulesAppliables: (typeof ParserRule | typeof Token)[]};
	constructor(t: Token[], i=0, lnm?: {index: number, rulesAppliables: (typeof ParserRule | typeof Token)[]}){
		[this.tokens, this.index] = [t, i]; lnm && (this.lastNotMatching = {index: lnm.index, rulesAppliables: lnm.rulesAppliables.slice()})
	}
	clone(){ return new TokenDeck(this.tokens, this.index, this.lastNotMatching); }
	get front () { return this.tokens[this.index]; }
	get last () { return this.index ? this.tokens[this.index - 1] : undefined; }
	use() { this.index++; return this; }
	noMatchWith(...rules: (typeof ParserRule | typeof Token)[]) {
		if(!rules.length)
			return this;
		if(!this.lastNotMatching)
			this.lastNotMatching = {index: this.index, rulesAppliables: rules};
		else if(this.lastNotMatching.index == this.index)
			for(let r of rules) this.lastNotMatching.rulesAppliables.push(r);
		else if(this.lastNotMatching.index < this.index)
			[this.lastNotMatching.index, this.lastNotMatching.rulesAppliables] = [this.index, rules];
		return this;
	}
	get errIndex() { return this.lastNotMatching ? this.lastNotMatching.index : -1 }
	get success() { return !this.lastNotMatching || this.index != this.lastNotMatching.index }
	compare(d: TokenDeck) {  return this.lastNotMatching && this.lastNotMatching.index > (<any>d.lastNotMatching || {}).index }
	preserveError(d: TokenDeck) { 
		if(this.compare(d) && this.lastNotMatching)
			d.lastNotMatching = {index: this.lastNotMatching.index+0, rulesAppliables: this.lastNotMatching.rulesAppliables.slice()};
		return d;
	}
	select() : TokenDeck {
		let o = this.clone().matchPair();
		if(!o)
			return new TokenDeck([]);
		return new TokenDeck(this.tokens.slice(this.index+1, o.index-1));
	}
	countBlocks() : number {
		let n = 0;
		while(this.front){
			n++;
			try{
				this.matchPair();
			}catch(x){
				this.use();
			}
		}
		return n;
	}
	matchPair() : TokenDeck | false{
		let objective = this.front.pairedWith;
		if(!objective)
			throw "matchPair: try to match pair with not pairable token";
		while(this.front && this.front != objective)
			this.use();
		this.use();
		return this.front ? this : false;
	}
	reach(...r: typeof Token[]) : TokenDeck | false {
		if(this.front instanceof EOF && r.every(o => o!=EOF)) return false;
		return r.some(o => this.front instanceof o) ? this.use() : this.use().reach(...r);
	}
	error(){
		if(!this.lastNotMatching)
			throw "Error: no error here. (that's ironical, isn't it?)";
		let token = this.tokens[this.lastNotMatching.index];
		console.log(token.error(this.lastNotMatching.rulesAppliables.map(o => o.name).join(' or '))+" expected.");
	}
	// static compile<T>(list: T[], f: (_:T) => TokenDeck, t: (o: T, deck: TokenDeck) => T, def: T) {
	// 	console.log('----------------------', list);
	// 	let max = -1;
	// 	for(let o of list)
	// 		max = Math.max(f(o).errIndex, max);
	// 	let L = list.reduce((p,c) => p ? (f(p).compare(f(c)) ? p : c) : c, def);
	// 	let S = list.find(o => f(o).success);
	// 	// if(S)
	// 	// 	f(S).lastNotMatching = f(L).lastNotMatching;
	// 	let r = S || L;
	// 	max = Math.max(f(r).errIndex, max);
	// 	if(max > f(r).errIndex)
	// 		debugger;
	// 	return r;
	// }
}