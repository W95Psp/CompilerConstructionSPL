import * as colors from 'colors';
import * as Lexer from './lexer';
import * as Parser from './parser';
import * as LexSPL from './spl.lexer';
import {Let, Tuple, Tuple3, flatten, filterUndef, SimpleUniqueTree} from './tools';
// import * as Types from './type';
import {
	ErrorUnifying,Replacement,applyReplacements,Type,UnknownType,FunctionType,ListType,TupleType,UnknownTypeLimited,VariableType, IntegerType, BooleanType,Context,CombinedType,TypeSetParserRule
} from './type';

import * as T from './type';
import * as ParserSPL from './spl.parser';


let O = {
	ErrorUnifying,applyReplacements,Type,UnknownType,FunctionType,ListType,TupleType,UnknownTypeLimited,VariableType, IntegerType, BooleanType,Context,CombinedType,TypeSetParserRule
};
for(let k in O)
	(<any>global)[k] = (<any>O)[k];

// let a = ParserSPL.Exp.getPossibleSequence(new Map());

declare var $:any;

(<any>global).ParserSPL = ParserSPL;
(<any>global).LexSPL = LexSPL;

ParserSPL.SPL_Parser.optimize();

let xxxx = new VariableType([new IntegerType(), new BooleanType()], 'xxxx');

let standartLibrary:{[index: string]: FunctionType} = {
	'op1_!': new FunctionType([new BooleanType()], new BooleanType()),
	'op1_-': new FunctionType([new IntegerType()], new IntegerType()),
	'op2_-': new FunctionType([new IntegerType(),new IntegerType()], new IntegerType()),
	'op2_+': new FunctionType([xxxx,xxxx], new IntegerType()),
	'op2_*': new FunctionType([new IntegerType(),new IntegerType()], new IntegerType()),
	'op2_/': new FunctionType([new IntegerType(),new IntegerType()], new IntegerType()),
	'op2_%': new FunctionType([new IntegerType(),new IntegerType()], new IntegerType()),
	'op2_==': new FunctionType([new BooleanType(),new BooleanType()], new BooleanType()),
	'op2_>=': new FunctionType([new IntegerType(),new IntegerType()], new BooleanType()),
	'op2_<=': new FunctionType([new IntegerType(),new IntegerType()], new BooleanType()),
	'op2_>': new FunctionType([new IntegerType(),new IntegerType()], new BooleanType()),
	'op2_<': new FunctionType([new IntegerType(),new IntegerType()], new BooleanType()),
	'op2_!=': new FunctionType([new BooleanType(),new BooleanType()], new BooleanType()),
	'op2_&&': new FunctionType([new BooleanType(),new BooleanType()], new BooleanType()),
	'op2_||': new FunctionType([new BooleanType(),new BooleanType()], new BooleanType()),
	'op2_:': Let(new UnknownType(), t => 
		Let(new ListType(t), lt => new FunctionType([t,lt], lt)))
};
let getStdlib = (name: string) => {
	if(!standartLibrary[name])
		throw "Can't find standart library function named \"" + name + "\"";
	return standartLibrary[name];
};
let callFunction = (from: Parser.ParserRule, funSignature: Type, call: FunctionType) => {
	let output = call.output;
	let rps = call.internalUnifyWith(funSignature, true);
	if(rps instanceof ErrorUnifying){
		console.log(rps.path);
		throw from.error("Function call not compatible with function signature");
	}
	let fOutput = applyReplacements(output, rps);
	return Tuple3(fOutput, undefined, rps);
}


let TSPR = new TypeSetParserRule(
	[ParserSPL.ExpPar, (o: ParserSPL.ExpPar, g, ctx) => [g(o.exp),, []]],
	[ParserSPL.ListCst, (o: ParserSPL.ListCst, g, ctx) => [new ListType(o.content ? g(o.content) : new UnknownType()),, []]],
	[ParserSPL.ExpTuple, (o: ParserSPL.ExpTuple, g, ctx) => [new TupleType(g(o.left), g(o.right)),, []]],
	[ParserSPL.Exp, (o: ParserSPL.Exp, g, ctx) => [g(o.content),, []]],
	[ParserSPL.ExpNOp2, (o: ParserSPL.ExpNOp2, g, ctx) => [g(o.content),, []]],
	[ParserSPL.ExpVar, (o: ParserSPL.ExpVar, g, ctx) => {
		let v = ctx.getValue(o.ident.content, o);
		if(!v)
			throw o.error('Cannot find such identifier in current scope');
		return [g(v),, []];
	}],
	[ParserSPL.ExpOp2, (o: ParserSPL.ExpOp2, g, ctx) => 
		callFunction(o,
			getStdlib('op2_'+o.operator.content),
			new FunctionType([g(o.left),g(o.right)], new UnknownType())
		)
	],
	[ParserSPL.ExpOp1, (o: ParserSPL.ExpOp1, g, ctx) => 
		callFunction(o,
			getStdlib('op_'+o.operator.content),
			new FunctionType([g(o.exp)], new UnknownType())
		)
	],
	//LexSPL.BasicType | TupleType | ListType | LexSPL.Id
	[ParserSPL.Type, (o: ParserSPL.Type, g, ctx) => [
			o.type instanceof LexSPL.BasicType ? (
					o.type.content=='Bool' 	? new BooleanType() : new IntegerType()) :
			o.type instanceof LexSPL.Id ? new VariableType([], o.type.content) : g(o.type) 
		,, []]],
	[ParserSPL.TupleType, (o: ParserSPL.TupleType, g, ctx) => [new TupleType(g(o.left), g(o.right)),, []]],
	[ParserSPL.ListType, (o: ParserSPL.ListType, g, ctx) => [new ListType(g(o.type)),, []]],
	[ParserSPL.VarType, (o: ParserSPL.VarType, g, ctx) => {
		return [new VariableType(o.inner instanceof LexSPL.Any ? [] : o.inner.couldBe.map(g) as CombinedType[], o.name.content),, []];
	}],
	[ParserSPL.FunDeclT, (o: ParserSPL.FunDeclT, g, ctx) => [g(o.type),, []]],
	[ParserSPL.FunType, (o: ParserSPL.FunType, g, ctx) => {
		if(o.output.type instanceof LexSPL.Void)
			throw "Void return not supported yet";
		return [new FunctionType(o.inputs.map(g), g(o.output.type)),, []];
	}],
	[ParserSPL.LambdaType, (o: ParserSPL.LambdaType, g, ctx) => {
		debugger;
		return [g(o.fun),, []];
	}],
	[ParserSPL.FunCall, (o: ParserSPL.FunCall, g, ctx) => {
		let inputsType = o.getArgs().map(g);
		let f = ctx.getValue(o.funName, o);
		if(!f)
			throw o.error("Cannot find function "+o.funName);
		let t = g(f);
		if(!(t instanceof FunctionType))
			throw o.error("Value "+o.funName+" is not a function");
		return callFunction(o, t, new FunctionType(inputsType, new UnknownType()));
	}],
	[ParserSPL.FunDecl, (o: ParserSPL.FunDecl, g, ctx) => {
			ctx.declareValue(o.name.content, o); // TODO
			let t = o.type ? g(o.type) as FunctionType
					: new FunctionType(o.args.map(o => new UnknownType('?'+o.content)), new UnknownType(o.name.content+'_output'));
			let unknownsNames = new Set((<UnknownType[]>t.search(x => x instanceof UnknownType)).map(o => o.name));
			let nctx = ctx.child(o, ...unknownsNames.values());
			let args = o.args.map(o => o.content);

			if(t.ctInputs.inside.length > args.length)
				throw o.name.error('Got '+t.ctInputs.inside.length+' annotations but only '+args.length+' arguments');
			if(t.ctInputs.inside.length < args.length)
				throw o.name.error('Got '+args.length+' arguments but only '+t.ctInputs.inside.length+' annotations');

			let dupError = (t:Lexer.Token[]) => {
				let dup = t.map(o => o.content).duplicates();
				if(!dup.length)
					return;
				let [i,n] = dup[0];
				let others = dup.slice(1).map(([,n]) => n).join(', ');
				throw t[i].error(others ? 'Duplicate indentifiers '+n+', '+others : 'Duplicate indentifier '+n);
			}
			o.varDecls.forEach(nctx.typeOf, nctx); // eval type and store type informations in context
			dupError([...[...o.funDecls, ...o.varDecls].map(o => o.name), ...o.args]); // make sure no var/fun have same name

			let dtree = new Map(o.funDecls.map(o => Tuple(o.name.content, o.getReturnPaths())));
			let indexNoReturns = [...dtree.values()].findIndex(t => !t);
			if(indexNoReturns!=-1)
				throw o.funDecls[indexNoReturns].name.error('No return statements found');
			let dtreeNE = <{maybe: ParserSPL.Ret[], concl: ParserSPL.Ret[]}[]>[...dtree.values()];
			let indexNoSureReturn = dtreeNE.findIndex(t => !t.concl.length);
			if(indexNoSureReturn!=-1)
				throw o.funDecls[indexNoSureReturn].name.error('Not every path leads to a return');

			let findVarsUsed = (o: Parser.ParserRule) : (ParserSPL.ExpVar | ParserSPL.FunCall)[] => 
				flatten(o.getValuesDirectFlat().map(o => [...(o instanceof ParserSPL.FunCall || o instanceof ParserSPL.ExpVar) ? [o] : [], ...findVarsUsed(o)]));

			let display = (o: SimpleUniqueTree<ParserSPL.FunDecl>, level: number = 0) => {
				let tabs = () => new Array(level).fill('\t').join('');
				[...o.data.entries()].forEach(([a,b]) => {
					console.log(tabs()+a.name.content);
					display(b, level+1);
				});
			}

			let listFunDecls = o.funDecls.filter(o => o.type === undefined);
			let tree = new SimpleUniqueTree<ParserSPL.FunDecl>();

			let findByName = (n: string) => listFunDecls.find(o => o.name.content==n);
			let anyCycle = (o: ParserSPL.FunDecl, parent: SimpleUniqueTree<ParserSPL.FunDecl>) => {
				if(tree.find(o))
					return;
				let nParent = parent.addChild(o); // link sub tree if o found (see tools.ts)
				if(parent.getParents().includes(o))
					throw o.getFirstToken().error('Cycle detected' + (o.name.content ? ' ('+
								nParent.getParents().getPairwise().map(([b,a]) => a.name.content+' needs '+b.name.content).join(', ')+')' : '')
							+ ' : cannot resolve type, please add annotations.');
				filterUndef(findVarsUsed(o).map(x => x instanceof ParserSPL.FunCall ? findByName(x.name.content) : undefined))
										   .forEach(x => anyCycle(x, nParent));
			};
			listFunDecls.forEach(o => anyCycle(o, tree));

			let funDecls = tree.getOrderedItems().reverse();
			funDecls.forEach(d => nctx.typeOf(d));

			o.Stmt.forEach(nctx.typeOf, nctx); // eval type of statements

			let returns = o.getReturnPaths();
			if(!returns)
				throw "No returns detected";
			let retTypes = filterUndef([...returns.concl, ...returns.maybe].map(o => o.exp ? nctx.typeOf(o.exp) : undefined)).map(([a,b]) => a);

			t = <FunctionType>t.replace(t.output, retTypes[0]);

			return [t, nctx, []];
		}
	]
);
let l = new LexSPL.SPL_Lexer(`
	f(nn) :: (var n :: Int Bool) -> ( -> Int) {
		a(s) { return b(2); }
		d(s) { return 0; }
		b(s) { return c(1); }
		c(s) { return 0; }
		hey(){ return 12; } 
		a = 2;
		return hey;
	}
`);
let p = new ParserSPL.SPL_Parser(l.tokenDeck);
if(p.result){
	let o = <ParserSPL.SPL>p.result;
	let ctx = new Context(o, TSPR);
	let xx = ctx.typeOf(o);
	console.log({p,o,ctx,xx});
	console.log(ctx.cacheTypeParserRules);
	for(let [key, value] of ctx.cacheTypeParserRules.entries()){
		console.log(key.print());
		console.log(value);
		console.log('');
		console.log('');
	}
}

// let f = (s:any) => new ParserSPL.SPL_Parser((new LexSPL.SPL_Lexer(s)).tokenDeck);
// let g = (n:any,s:any) => (new Array(n)).fill('(').join('') + s.toString() + (new Array(n)).fill(')').join('');


// let F = (s:any) => (<any>f(s)).result.decls.filter((o:any) => o && o.content instanceof ParserSPL.FunDecl)[0].content.getType(new T.Context());


// (<any>global).f = f;
// (<any>global).F = F;
// (<any>global).g = g;


// function TEST(){
// 	// f(((<any>global).document).getElementById('inp').value).computeTypes();
// 	let R = f(((<any>global).document).getElementById('inp').value);
// 	console.log(R.result);
// 	R.computeTypes();
// 	if(R.result)
// 		console.log('\n\n'+R.result.SSM().join('\n')+'\n\n');
// }
// (<any>global).TEST = TEST;

function keyHandler(e: any) {
	var TABKEY = 9;
	if (e.keyCode == 9) {
	e.preventDefault();
	var start = $(this).get(0).selectionStart;
	var end = $(this).get(0).selectionEnd;

	// set textarea value to: text before caret + tab + text after caret
	$(this).val($(this).val().substring(0, start)
				+ "\t"
				+ $(this).val().substring(end));

	// put caret at right position again
	$(this).get(0).selectionStart =
	$(this).get(0).selectionEnd = start + 1;
  }
}
(<any>global).document.getElementById('inp').onkeydown = keyHandler;
// (<any>global).TEST = TEST;

let document = (<any>global).document;

function createCookie(name: string,value:string,days=100) {
	var expires = "";
	if (days) {
		var date = new Date();
		date.setTime(date.getTime() + (days*24*60*60*1000));
		expires = "; expires=" + date.toUTCString();
	}
	document.cookie = name + "=" + value + expires + "; path=/";
}

function readCookie(name: string) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
}

let localStorage = (<any>global).localStorage;

document.getElementById('inp').value = localStorage.getItem('prog') || 'hey(a){}';
document.getElementById('inp').onkeyup = () => localStorage.setItem('prog', document.getElementById('inp').value);



// F(`
// 	hey(a){
// 		a = 3;
// 		if(a){
// 			if(a){
// 				return 23;
// 			}else{
// 				if(a){
// 					return 099;
// 				}else{
// 					if(a){
// 						return 199;
// 					}else{
// 						return 299;
// 					}
// 				}
// 			}
// 		}else{
// 			if(a){
// 				return 1;
// 			}else{
// 				if(a){
// 					return 0;
// 				}else{
// 					if(a){
// 						return 1;
// 					}else{
// 						return 2;
// 					}
// 				}
// 			}
// 		}
// 	}
// `);

// let b = root.add(2);
// let c = root.add(3);
// let d = root.add(4);
// a.add(2, root);
// a.add('hey');

// (<any>root).get(1).get(1).get(1).add(145); representNum(root);
// (<any>root).get(1).get(1).get(1).add(145, root); representNum(root);

// representNum(root);

// console.log('ROOT=',root);

