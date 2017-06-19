declare var require: any;
import * as colors from 'colors';
import {Let,Predicate,rnd,escapeRegExp} from './tools';
import {TokenDeck} from './tokenDeck';

export class Lexer {
	private static tokens = <(typeof Token)[]>[];
	static register(tk: typeof Token, regexp: RegExp, ignore = false, pairedWith?: typeof Token){
		if(!regexp.sticky) throw "Lexer rule "+tk.name+" has a non sticky flag regex.";
		[tk.regexp, tk.ignore, tk.pairedWith] = [regexp, ignore, pairedWith];
		this.tokens.push(tk);
	}
	static registerd(tk: typeof DeterministicToken, c: string, ignore = false, pairedWith?: typeof Token){
		let il = (s: string) => s.match(/[a-z]/i) ? '\\b' : '';
		this.register(tk, new RegExp(il(c[0]) + escapeRegExp(tk.content = c) + il(c[c.length - 1]), 'y'), ignore, pairedWith);
	}
	get static() { return (<typeof Lexer>this.constructor); } 
	tokens:Token[] = [];
	private data: string;
	get tokenDeck(){
		return new TokenDeck(this.tokens);
	}
	constructor(data: string){
		this.data = data;
		let result:undefined | Token;
		for(let position = 0; position < data.length; position += result.length){
			this.static.tokens.find(t => (result=t.match(data, position, this)) != undefined);
			if(result==undefined) throw this.error([position, 1], "unexpected character");
			(<typeof Token>result.constructor).ignore || this.tokens.push(result);
		}
		this.tokens.push(new EOF());

		let any = this.static.tokens.filter(o => o.pairedWith);
		let openings: Map<typeof Token | undefined, Token[]> = new Map();
		let closings: Map<typeof Token | undefined, Token[]> = new Map();
		any.forEach(o => Let(openings.get(o.pairedWith), op => (op ? closings:openings).set(o, op || [])));

		for(let o of this.tokens){
			let list = closings.get(o.static);
			if(list){
				let x = list.pop();
				if(!x)
					throw o.error('No matching '+(<typeof Token>o.static.pairedWith).name);
				(o.pairedWith = x).pairedWith = o;
			}else if(list = openings.get(o.static))
				list.push(o);
		}
		let deleteList: Set<Token> = new Set();
		let last:undefined|Token = undefined;
		for(let o of this.tokens){
			if(last && o.pairedWith && o.position < o.pairedWith.position && o.static.ignoreTooMuchPairs && last.static==o.static){
				deleteList.add(o);
				deleteList.add(o.pairedWith);
			}
			last = o;
		}
		this.tokens = this.tokens.filter(o => !deleteList.has(o));
	}
	error([position, len]: [number, number], message: string){
		let currentLineNext = this.data.substr(<number>position).split('\n')[0];
		let prev = this.data.substr(0, <number>position).split('\n');
		let line = prev.length;
		let currentLineBefore = (prev.pop() || "").replace(/\t/g, ' ');
		let currentLine = currentLineBefore + colors.red(currentLineNext.substr(0, len)) + colors.reset(currentLineNext.substr(len))
							+ "\n\t" + currentLineBefore.replace(/./g, ' ') + '^';
		return "Error: l" + line + ":" + currentLineBefore.length + " in : \n\t"+currentLine+'\n\t'+message.replace(/\n/g, '\n\t');
	}
}

let RandExp = require('randexp');
export class Token {
	static regexp: RegExp;
	static ignore: boolean;
	static ignoreTooMuchPairs = false;
	static pairedWith: undefined | (typeof Token);
	static match(data: string, position: number, lexer: Lexer) : undefined | Token {
		this.regexp.lastIndex = position;
		return Let(data.match(this.regexp), m => m ? new this(position, m[0].length, data, lexer) : undefined);
	}
	static generateRand(detph=0, l?: Lexer){ return Let(<string>(new RandExp(this.regexp).gen()), s => new this(0, s.length, s, l)); }
	private _refData: string;		private _lexer?: Lexer;
	private _position: number;		private _length: number;
	pairedWith: undefined | Token;
	constructor(position: number, length:number, refData: string, lexer?: Lexer){
		[this._position, this._length, this._refData, this._lexer] = [position, length, refData, lexer];
	}
	error(message: string) {
		if(this._lexer)
			return this._lexer.error([this._position, this._length], message);
		return "Error: "+message+" about token "+this.inspect();
	}
	get position()	{ return this._position; }
	get length()	{ return this._length; 	 }
	get content()	{ return this._refData.substring(this.position, this.position + this.length); }
	get static()	{ return <typeof Token>this.constructor; }
	inspect () 		{ return (<any>this.constructor).name + ' { position: '+this.position+', content: "'+this.content+'" }' ; }
}
export class DeterministicToken extends Token { static content: string; }

export class EOF extends Token {
	static match(c: string, b: number, a: Lexer) : undefined | Token {return undefined;}
	constructor (){super(<any>undefined, <any>undefined, <any>undefined, <any>undefined);}
	get position()	{ return 0; 		}
	get length()	{ return 0; 	 	}
	get content()	{ return ''; 	}
	static generateRand(detph=0){ return new this(); }
}