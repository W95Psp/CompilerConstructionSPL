import {Token, EOF, DeterministicToken} from './lexer';
import * as LexSPL from './spl.lexer';
import {Let,Tuple,Predicate,rnd,isChildOf, SimpleTree, flatten} from './tools';
import {TokenDeck} from './tokenDeck';
import * as Type from './type';


export interface ITSAdder{
	(f: any, name: string) : void;
	addStep(list?:boolean, ...formats: tokenOrRule[]): ((f: any, name: string) => void);
	addOptStep(list?:boolean, ...formats: tokenOrRule[]): ((f: any, name: string) => void);
	addIgnoreTokenStep(token: typeof DeterministicToken) :  ITSAdder;
}
let makeSureStepsExists = (f: any) => Object.keys(f.constructor).includes('steps') || (f.constructor.steps = []);
export class Parser {
	static rules: (typeof ParserRule)[] = [];
	static getMainRule() { return this.rules[0]; }
	static pushRule(f: any) { (this.rules[this.rules.length - 1] == f.constructor) || this.rules.push(f.constructor); }
	static addStep(list=false, ...formats: tokenOrRule[]){ return this._addStep(false, false, list, ...formats); }
	static addOptStep(list=false, ...formats: tokenOrRule[]){ return this._addStep(false, true, list, ...formats); }
	static _addStep(forceEmptyName: boolean, opt: boolean, list: boolean, ...formats: tokenOrRule[]){
		return (f: any, name: string) => {
			makeSureStepsExists(f);
			f.constructor.steps.push(new ParserRuleComplexStep(formats, forceEmptyName ? '' : name, opt, list));
			this.pushRule(f);
		};
	}
	result: ParserRule | undefined;
	cache: Map<number, Map<typeof ParserRule, {deck: TokenDeck, result?: ParserRule}>> = new Map();
	setCache(rule: typeof ParserRule, position: number, R: {deck: TokenDeck, result?: ParserRule}){
		let f = this.cache.get(position);
		if(!f) this.cache.set(position, f=new Map());
		f.set(rule, R);
		return R;
	}
	getCache(rule: typeof ParserRule, position: number){
		return (this.cache.get(position) || {get: _ => undefined}).get(rule);
	}
	get static() {return <typeof Parser>this.constructor}
	constructor(deck: TokenDeck){

		let r = this.static.getMainRule().parse(deck, this);
		if(!r.result)
			this.addError(r.deck);
		this.errors.forEach(e => e.error());
		this.result = r.result;
	}
	errors: TokenDeck[] = [];
	addError(e: TokenDeck) { this.errors.push(e); }
	static addIgnoreTokenStep(token: typeof DeterministicToken, executeThat?: ITSAdder) : ITSAdder{
		let F = <ITSAdder>((f: any, name: string) => {
			makeSureStepsExists(f);
			executeThat && executeThat(f, name);
			f.constructor.steps.push(new ParserRuleIgnoreStep(token));
			this.pushRule(f);
		});
		F.addStep = (list?:boolean, ...formats: tokenOrRule[]) => (f: any, name: string) => {F(f, name);this.addStep(list, ...formats)(f, name);};
		F.addOptStep = (list?:boolean, ...formats: tokenOrRule[]) => (f: any, name: string) => {F(f, name);this.addOptStep(list, ...formats)(f, name);};
		F.addIgnoreTokenStep = (token: typeof DeterministicToken) => this.addIgnoreTokenStep(token, F);
		return F;
	}
	static optimize() { this.rules.forEach(o => o.optimize()); }
	static prettyPrintGrammarRule() {
		return this.rules.map(o => o.prettyPrintGrammarRule()).join('\n');
	}
}

let getSide = (mode: boolean) => (l_: ParserRuleStep[]) => {
	let l = mode ? l_.slice().reverse() : l_;
	let list = <tokenOrRule[]>[];
	for(let o of l){
		o.getPossibles().forEach(x => list.push(x));
		if(!(o instanceof ParserRuleComplexStep) || !o.nonePossible)
			break;
	}
	return list;
}
type tokenOrRule = typeof ParserRule | typeof Token;
type tPart = Token | ParserRule | (Token | ParserRule)[];
let hasProperty = (o:any, p: string) => Object.getOwnPropertyNames(o).includes(p);


export class ParserRule {
	// ctx: Type.Context;
	parent: ParserRule;
	static isLeftRecursive(parents = <(typeof ParserRule)[]>[]) : undefined | (typeof ParserRule)[] {
		let parent = [...parents, this].map(o => o);
		let list = this.steps[0].getPossiblesParserRules();
		return (list.find(o => parent.includes(o)) ? parent : undefined) || list.map(o => o.isLeftRecursive(parent))[0];
	}
	static getTokens(f: (_:ParserRuleStep[]) => tokenOrRule[], parents = new Set<typeof ParserRule>()) : Set<typeof Token> {
		parents.add(this);
		let {tokens, rules} = f(this.steps).split((o): o is typeof ParserRule => isChildOf(o, ParserRule), (rules, tokens: (typeof Token)[]) => ({tokens, rules}));
		return new Set([...tokens, ...rules.filter(r => !parents.has(r)).reduce((p,c) => p.concat([...c.getTokens(f, parents)]), <typeof Token[]>[])]);
	}
	getFirstToken() : Token{
		let first = Let(this.getValuesDirect()[0], x => x instanceof Array ? x[0] : x);
		return Let(first, o => o instanceof Token ? o : o.getFirstToken());
	}
	static prettyPrintGrammarRule() : string {
		return this.name+':\t'+this.steps.map(o => 
						o.getPossibles().map(o => 
							isChildOf(o, DeterministicToken) ? "'"+o.content+"'" : o.name
						).join(' | ').trim()
					).join(', ').trim();
	}
	// typeCache: Map<Type.Context, Type.Type> = new Map();
	// getType(ctx: Type.Context) : Type.Type {
	// 	this.ctx = ctx;
	// 	let o = this.typeCache.get(ctx);
	// 	o || this.typeCache.set(ctx, o = this._getType(ctx));
	// 	return o;
	// }
	// clearTypeCaches() {
	// 	this.typeCache = new Map();
	// 	this.getValuesDirectFlat().forEach(o => o.clearTypeCaches());
	// }
	// _getType(ctx: Type.Context) : Type.Type {
	// 	this.getValuesDirectFlat().forEach(o => o.getType(ctx));
	// 	return new Type.VoidType(this);
	// }
	error(message: string) : string {
		return this.getFirstToken().error(message);
	}
	extract<M>(predicate: (_: ParserRule) => boolean, ...transformers: ((_:SimpleTree<ParserRule|M>) => void)[]) : SimpleTree<ParserRule|M> | SimpleTree<ParserRule|M>[] {
		let toArray = <T>(o:T|Array<T>) => o instanceof Array ? o : [o];
		let children = (<ParserRule[]>this.getValuesDirect().map(toArray).reduce((p,c) => p.concat(c), []).filter(o => o instanceof ParserRule))
										  .map(child => Let(child.extract(predicate, ...transformers), toArray))
										  .reduce((p,c) => p.concat(c), []);
		if(predicate(this)){
			let T = new SimpleTree<ParserRule|M>(this);
			(<SimpleTree<ParserRule|M>>T.get(this)).merge(...children);
			transformers.forEach(f => f(T));
			return T;
		}
		return children;
	}
	private static _cache_opening_tokens?: Set<typeof Token>;
	static getOpeningTokens() {
		if(hasProperty(this, '_cache_opening_tokens')) return <Set<typeof Token>>this._cache_opening_tokens;
		return this._cache_opening_tokens=this.getTokens(getSide(false));
	}
	static getClosingTokens() { return this.getTokens(getSide(true)); }
	static getInsideTokens() {
		return this.getTokens(l => {
			let lastStep = l[l.length-1];
			let toAdd;
			if(l instanceof ParserRuleComplexStep && !l.multiPossible && !l.nonePossible)
				toAdd = lastStep.getPossiblesParserRules();
			else
				toAdd = lastStep.getPossibles();
			let list = l.slice(0, -1).map(o => o.getPossibles()).concat(toAdd);
			return list.reduce((p,o)=>p.concat(o), <tokenOrRule[]>[]);
		});
	}
	static bootstrap?: typeof Token | Set<typeof Token>;
	static optimize(){
		let err = this.isLeftRecursive();
		if(err && err.length) throw "Left recursion detected : {"+ err.map(o => o.name).join(' > ') + "}, this is not allowed.";
		this.steps.forEach(o => o.optimize());
		let openingTokens = this.getOpeningTokens(), closingTokens = this.getClosingTokens(), insideTokens = this.getInsideTokens();
		let cl: undefined|typeof Token, op: undefined|typeof Token;
		if(openingTokens.size==1 && closingTokens.size==1 && (cl=(op=[...openingTokens][0]).pairedWith) && closingTokens.has(cl))
			this.bootstrap = op;
		else if (closingTokens.size && [...closingTokens].every(t => !insideTokens.has(t)))
			this.bootstrap = closingTokens;
	}
	static steps:ParserRuleStep[] = [];
	static generateRand(depth=0) : ParserRule {
		let o = new this();
		this.getComplexSteps().forEach(s => o.set(s.name, s.generateRand(depth + 1)));
		return o;
	}
	static accept(token: Token) { return this.getOpeningTokens().has(token.static); }

	static parse(input_tokens: TokenDeck, parser: Parser, result?: ParserRule) : {deck: TokenDeck, result?: ParserRule} {
		let bpos = input_tokens.front.position, cache = parser.getCache(this, bpos);
		if(cache)
			return cache;
		if(!this.accept(input_tokens.front)) return {deck: input_tokens.noMatchWith(this)};
		let steps = this.steps.mapUntil(s => ({s, r: s.match(input_tokens.clone(),parser)}), ({s,r}) => {
			input_tokens = input_tokens.preserveError(r.deck);
			return r.result !== undefined;
		});
		if(steps.matchingItem) return {deck: steps.matchingItem.r.deck.preserveError(input_tokens.noMatchWith(this))}
		result = result || new this();
		steps.listNotMatching.forEach(({s,r}) => s instanceof ParserRuleComplexStep && (typeof r.result=='boolean' || (<ParserRule>result).set(s.name, r.result)));
		// console.log('--------------------------');
		// console.log(result.print());
		// console.log(result);
		return parser.setCache(this, bpos, {deck: input_tokens.clone(), result});
	}

	get prettyPrintString () {
		return this.print();
	}
	get static(){ return <typeof ParserRule>this.constructor; }
	getSteps() { return this.static.steps; }
	static getComplexSteps() { return <ParserRuleComplexStep[]>this.steps.filter(o => o instanceof ParserRuleComplexStep); }
	getComplexSteps() { return this.static.getComplexSteps(); }
	get(key: string) : undefined | tPart {
		if(!this.getComplexSteps().find(o => o.name==key))
			throw "Property "+key+" does not exists on type "+this.constructor.name;
		return (<any>this)[key];
	}
	set(key: string, obj: undefined | tPart) : undefined | tPart {
		if(!this.getComplexSteps().find(o => o.name==key && ((o.multiPossible && o instanceof Array) || !(o instanceof Array))))
			throw "Property "+key+" does not exists (or invalid type) on type "+this.constructor.name;
		(<ParserRule[]>(obj instanceof Array ? obj : [obj]).filter(o => o instanceof ParserRule)).map(o => o.parent = this);
		return (<any>this)[key] = obj;
	}
	getValuesDirectFlat() : ParserRule[] { // (<any>this)[s.name] can also return undefined, that's why filter is there
		return <ParserRule[]>this.getValuesDirect().map(o => o instanceof Array ? o : [o]).reduce((p,c) => p.concat(c), [])
						.filter(o => !(o instanceof Token))
	}
	getValuesDirect() : tPart[] { // (<any>this)[s.name] can also return undefined, that's why filter is there
		return this.getSteps().map(s => <tPart>(s instanceof ParserRuleComplexStep ? this.get(s.name) : undefined)).filter(o => o && !(o instanceof Array && !o.length));
	}
	getValues() : (string | tPart)[] { // (<any>this)[s.name] can also return undefined, that's why filter is there
		return this.getSteps().map(s => s instanceof ParserRuleComplexStep ? this.get(s.name) || '' : (<any>s).content).filter(o => o);
	}
	getKeys() {
		return this.getSteps().map(s => <string>(s instanceof ParserRuleComplexStep ? s.name : undefined)).filter(o => o);
	}
	getMapFromValuesToKeys() {
		let map = this.getKeys().map(k => ({k, v: <tPart>this.get(k)})).filter(({k,v}) => v)
								.map(o => o.v instanceof Array ? o.v.map(v => ({k:o.k, v})) : [{k:o.k, v: o.v}])
								.reduce((p, c) => p.concat(c)).map(({v,k}) => Tuple(v, k), []);
		return new Map(map);
	}
	static prettyPrint_indent = false;	static prettyPrint_after = '';
	static prettyPrint_newLine = false;	static prettyPrint_before = '';
	print(i=0) : string {
		let indent = i + +this.static.prettyPrint_indent;
		let identStr = new Array(indent+1).join('\t');
		let before = this.static.prettyPrint_before + (this.static.prettyPrint_newLine ? '\n'+identStr : '');
		let after = this.static.prettyPrint_after + (this.static.prettyPrint_newLine ? '\n' : '');
		return (before + this.getValues().map(o => 
						o instanceof Token 	? o.content :
						o instanceof ParserRule ? o.print(indent) :
						o instanceof Array 		? o.map(x => x instanceof ParserRule ? x.print() : x.content).join(' ')
												: o
					).join(' ') + after).replace(/\n(\t*)\n/g, (_,a) => '\n'+a).replace(/\n(\t*)\n/g, (_,a) => '\n'+a);
	}
	SSM() { return ['error in '+this.static.name]; };
}

export let ppNewLine = (f: typeof ParserRule) => {f.prettyPrint_newLine = true};
export let ppIdent = (f: typeof ParserRule) => {f.prettyPrint_indent = true};
export let ppPutVal = (before: string, after: string) => (f: typeof ParserRule) => {f.prettyPrint_after = after;f.prettyPrint_before = before;};
type mapToken = Map<typeof Token, (typeof ParserRule[]) | true>;
export abstract class ParserRuleStep {
	abstract generateRand(depth: number) : undefined | ParserRule | Token | (ParserRule | Token)[];
	abstract getPossibles(): tokenOrRule[];
	private _classes?: mapToken;
	get classes() { this._classes || this.optimize(); return <mapToken>this._classes; }
	optimize() {
		let c = this._classes = <mapToken>new Map();
		let add = (t: typeof Token, o: true | typeof ParserRule) => 
				isChildOf(o, ParserRule) ? Let(c.get(t), l =>
						l instanceof Array ? l.push(o) : typeof l == 'boolean' ? 0 : c.set(t, [o])
					) : c.set(t, true);
		this.getPossiblesTokens().forEach(o => add(o, true));
		this.getPossiblesParserRules().forEach(o => o.getOpeningTokens().forEach(t => add(t, o)));
	};

	abstract match(tokens: TokenDeck, parser: Parser): {deck: TokenDeck, result?: ParserRule | Token | (ParserRule | Token)[] | boolean};
	protected matchOne(tokens: TokenDeck, parser: Parser): {deck: TokenDeck, result?: ParserRule | Token} {
		let max = tokens;
		let possibles = this.classes.get(tokens.front.static) || [];
		if(possibles===true)
			return Let(tokens.clone().use(), deck => ({deck, result: tokens.front}));
		let nStack = this.getPossibles();
		let firstRule = possibles[0];

		if(firstRule && firstRule.bootstrap && possibles.length>1 && !possibles.find(p => p.bootstrap instanceof Set)){
			let sl = tokens.select();
			let n = sl.countBlocks();
			let oldPossibles = possibles.slice();
			let nB = possibles.length;
			possibles = possibles.filter(p => n >= p.steps.length-2);
		}
		if(possibles.length==1 && firstRule.bootstrap){
			let deck = tokens.clone();
			if(firstRule.bootstrap instanceof Set)
				deck.reach(...[...firstRule.bootstrap]);
			else
				deck.matchPair();

			let result = new firstRule();

			let r = firstRule.parse(tokens.clone(), parser, result);
			if(!r.result)
				parser.addError(r.deck);

			return {deck, result};
		}

		for(let o of possibles){
			let parsed = o.parse(tokens.clone(),parser);
			if(parsed.deck)
				max = parsed.deck.errIndex > max.errIndex ? parsed.deck : max;
			if(parsed.result)
				return parsed;
		}
		let D = {deck: tokens.noMatchWith(...nStack)};
		if(D.deck.lastNotMatching)
			D.deck.lastNotMatching = max.lastNotMatching;
		// D.deck
		return D;

		// return TokenDeck.compile(possibles.mapUntilUnified(p=>{
		// 	let X = p.parse(tokens.clone(), stack);
		// 	max = Math.max(max, X.deck.errIndex);
		// 	return X;
		// }, o=>!o.deck.success), o => o.deck, (o, deck) => ({result: o.result, deck}), {deck: tokens.noMatchWith(...nStack)});
	}
	getPossiblesParserRules(): (typeof ParserRule)[] { return <any>this.getPossibles().filter(o => isChildOf(o, ParserRule)); };
	getPossiblesTokens(): (typeof Token)[] { return <any>this.getPossibles().filter(o => isChildOf(o, Token)); };
}
export class ParserRuleComplexStep extends ParserRuleStep {
	name: string;			possibles: tokenOrRule[];
	nonePossible: boolean;	multiPossible: boolean;
	static maxDepth = 8; 	static maxChildren = 10;
	constructor(possibles: tokenOrRule[], name: string, nonePossible: boolean, multiPossible: boolean){
		super();
		[this.possibles, this.name, this.nonePossible, this.multiPossible] = [possibles, name, nonePossible, multiPossible];
	}
	private get static() {return <typeof ParserRuleComplexStep>this.constructor}
	private get maxDepth(){ return this.static.maxDepth }
	private get maxChildren(){ return this.static.maxChildren }
	match(tokens: TokenDeck, parser: Parser): {deck: TokenDeck, result?: boolean | ParserRule | Token | (ParserRule | Token)[]} {
		if(this.multiPossible){
			let list = [], o;
			do{
				o = this.matchOne(tokens,parser);
			}while(o.result && list.push(o) && (tokens=o.deck));
			if(!list.length && !this.nonePossible) // no result, should be one, error
				return {deck: tokens};
			let res = {deck: list.length ? list[list.length-1].deck : tokens, result: list.map(o => <ParserRule|Token>o.result)};
			return res;
		}else
			return Let(this.matchOne(tokens,parser), r => ({deck: r.deck, result: (!r.result && this.nonePossible) ? false : r.result}));
	}
	generateRand(depth=0) : undefined | ParserRule | Token | (ParserRule | Token)[] {
		let lrnd = depth>this.maxDepth ? (m:number,_:number) => m : rnd;
		let f = this.possibles[rnd(0, this.possibles.length-1)];
		let get = () => f.generateRand(depth + 1);
		if(this.multiPossible)
			return new Array(lrnd(this.nonePossible?0:1, this.maxChildren)).fill(0).map(_ => get());
		else
			return (this.nonePossible && lrnd(0,1)==0) ? undefined : get();
	}
	getPossibles() { return this.possibles };
}

export class ParserRuleIgnoreStep extends ParserRuleStep{
	token: typeof DeterministicToken;
	getPossibles() { return [this.token]; }
	constructor(token: typeof DeterministicToken){
		super();
		this.token = token;
	}
	match(tokens: TokenDeck, parser: Parser): {deck: TokenDeck, result?: ParserRule | Token | (ParserRule | Token)[]} {
		return this.matchOne(tokens, parser);
	}
	generateRand(depth=0) : undefined | ParserRule | Token | (ParserRule | Token)[] {
		return this.token.generateRand();
	}
	get content(){ return this.token.content; }
}