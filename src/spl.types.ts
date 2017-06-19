import * as colors from 'colors';
import * as Lexer from './lexer';
import * as Parser from './parser';
import * as LexSPL from './spl.lexer';
import {Let, Tuple, Tuple3, flatten, filterUndef, SimpleUniqueTree} from './tools';
import * as SSM from './SSM_spec';

// import * as Types from './type';
import {
	TypeStorage, ordLexOrder, ErrorUnifying,Replacement,applyReplacements,Type,UnknownType,FunctionType,ListType,TupleType,UnknownTypeLimited,VariableType, IntegerType, BooleanType,Context,CombinedType,TypeSetParserRule
} from './type';

import * as T from './type';
import * as ParserSPL from './spl.parser';

let callFunction = (from: Parser.ParserRule, funSignature: Type, call: FunctionType) => {
	let output = call.output;
	let rps = call.internalUnifyWith(funSignature, true);
	if(rps instanceof ErrorUnifying){
		let path = rps.path;
		let errEnt: Parser.ParserRule;
		if(from instanceof ParserSPL.FunCall)
			errEnt = from.getArgs()[call.ctInputs.inside.findIndex(o => o==path[0][1])] || from;
		else
			errEnt = from;
		throw errEnt.error("No such function signature. "+funSignature+" expected, "+call+" given.\nMore specific error: "+rps.path[0][2]);
	}
	let fOutput = applyReplacements(output, rps);
	let rps_filtered = rps;
	if(!(from instanceof UnknownType))
		rps_filtered = rps.filter(([a, b]) => funSignature.search(t => t.equal(a)).length==0);
	return Tuple3(fOutput, undefined, rps_filtered);
}

let xxxx = new VariableType([new IntegerType(), new BooleanType()], 'xxxx');
let standartLibrary:{[index: string]: FunctionType} = {
	'op1_!': new FunctionType([new BooleanType()], new BooleanType()),
	'op1_-': new FunctionType([new IntegerType()], new IntegerType()),
	'op2_-': new FunctionType([new IntegerType(),new IntegerType()], new IntegerType()),
	'op2_+': new FunctionType([new IntegerType(),new IntegerType()], new IntegerType()),
	'op2_*': new FunctionType([new IntegerType(),new IntegerType()], new IntegerType()),
	'op2_/': new FunctionType([new IntegerType(),new IntegerType()], new IntegerType()),
	'op2_%': new FunctionType([new IntegerType(),new IntegerType()], new IntegerType()),
	'op2_==': new FunctionType([xxxx,xxxx], new BooleanType()),
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



export let TSPR = new TypeSetParserRule(
	[ParserSPL.ExpPar, (o: ParserSPL.ExpPar, g, ctx) => [g(o.exp),, []]],
	[ParserSPL.ListCst, (o: ParserSPL.ListCst, g, ctx) => [new ListType(o.content ? g(o.content) : new UnknownType()),, []]],
	[ParserSPL.ExpTuple, (o: ParserSPL.ExpTuple, g, ctx) => [new TupleType(g(o.left), g(o.right)),, []]],
	[ParserSPL.Exp, (o: ParserSPL.Exp, g, ctx) => [g(o.content),, []]],
	[ParserSPL.ExpNOp2, (o: ParserSPL.ExpNOp2, g, ctx) => [g(o.content),, []]],
	[ParserSPL.ExpVar, (o: ParserSPL.ExpVar, g, ctx) => {
		let v = ctx.getValue(o.ident.content, o);
		if(!v)
			throw o.error('Cannot find such identifier in current scope');
		let t = g(v);
		let current = o.field;
		while(current){
			let f = current.fieldName.content;
			if(f=='fst' || f=='snd')
				if(t instanceof TupleType)
					t = t.inside[f=='fst' ? 0 : 1];
				else throw current.error(f+' on a non-tuple value');
			else if(f=='tl' || f=='hd'){
				if(t instanceof ListType)
					t = f=='hd' ? t.inside[0] : t;
				else throw current.error(f+' on a non-list value');
			}
			current = current.nextField;
		}
		return [t,, []];
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
	[ParserSPL.LambdaType, (o: ParserSPL.LambdaType, g, ctx) => [g(o.fun),, []]],
	[ParserSPL.Assign, (o: ParserSPL.Assign, g, ctx) => {
		let name = o.ident.content;
		let v = ctx.getValue(name, o); /* important: getValue put outside variable if needed */
		if(!v)
			throw o.ident.error('Cannot find such identifier in current scope');
		let t = ctx.typeOf(v);
		if(!t)
			throw o.ident.error('No type information found (internal error)');
		return [t[0], ctx, []];
	}],
	[ParserSPL.VarDecl, (o: ParserSPL.VarDecl, g, ctx) => {
		let name = o.name.content;
		if(ctx.hasLocalValue(name))
			throw o.name.error('Duplicate identifier');
		ctx.declareValue(name, o, TypeStorage.Normal);
		return [g(o.exp)/* compute inside type */,, []];
	}],
	[ParserSPL.If, (o: ParserSPL.If, g, ctx) => {
		let typeCondition = ctx.typeOf(o.cond);
		if(!typeCondition)
			throw o.cond.error("not a boolean");

		let result = typeCondition[0].internalUnifyWith(new BooleanType());
		if(result instanceof ErrorUnifying)
			throw o.cond.error("not a boolean");

		return [,,[]];
	}],
	[ParserSPL.While, (o: ParserSPL.While, g, ctx) => {
		let typeCondition = ctx.typeOf(o.cond);
		if(!typeCondition)
			throw o.cond.error("not a boolean");

		let result = typeCondition[0].internalUnifyWith(new BooleanType());
		if(result instanceof ErrorUnifying)
			throw o.cond.error("not a boolean");

		return [,,[]];
	}],
	[ParserSPL.FunCall, (o: ParserSPL.FunCall, g, ctx) => {
		let inputsType = o.getArgs().map(g);
		let f = ctx.getValue(o.funName, o);
		let m;
		if(!f && (m=ctx.standartLibrary.get(o.funName)))
			return callFunction(o, m[0], new FunctionType(inputsType, new UnknownType()));
		if(!f){
			throw o.error("Cannot find function "+o.funName);
		}
		let t = g(f);
		if(t instanceof UnknownType){
			let fakeFunType = new FunctionType(inputsType.map(o => new VariableType([])), new VariableType([]));
			let [tt,,rr] = callFunction(o, t, new FunctionType(inputsType, new UnknownType()));
			return [tt,,[...rr, Tuple(t, fakeFunType)]];
		}
		if(!(t instanceof FunctionType))
			throw o.error("Value "+o.funName+" is not a function");
		return callFunction(o, t, new FunctionType(inputsType, new UnknownType()));
	}],
	[ParserSPL.FunDecl, (o: ParserSPL.FunDecl, g, ctx) => {
			// we declare the identifier and link it to the FunDecl entity
			ctx.declareValue(o.name.content, o);

			let t = o.type ?
					  g(o.type) as FunctionType
					: new FunctionType(o.args.map(o => new UnknownType('?'+o.content)), new UnknownType(o.name.content+'_output'));

			// fetch all variableTypes
			let localVarTypes = new Set((<UnknownType[]>t.search(x => x instanceof UnknownType || x instanceof VariableType)).map(o => o.name));
			// create a new context
			let nctx = ctx.child(o, ...localVarTypes.values());

			// declare the type and context
			ctx.cacheTypeParserRules.set(o, [t, nctx]);

			// declare fun parameters (with types)
			o.argsParserRules.map((j,i) =>
					nctx.declareValue(j.name.content, j, TypeStorage.Normal, i - o.args.length, t.ctInputs.inside[i])
				);

			debugger;
			
			// ************************************ (Non nctx altering part /begin)
				// get args
				let args = o.args.map(o => o.content);

				// check args consistency
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
				dupError([...[...o.funDecls, ...o.varDecls].map(o => o.name), ...o.args]); // make sure no var/fun have same name


				// check return consistency
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

				let listFunDecls = o.funDecls;

				let findByName = (n: string) => listFunDecls.find(o => o.name.content==n);
				let anyCycle = (o: ParserSPL.FunDecl, parent: SimpleUniqueTree<ParserSPL.FunDecl>, tree: SimpleUniqueTree<ParserSPL.FunDecl>) => {
					if(tree.find(o))
						return;
					let nParent = parent.addChild(o); // link sub tree if o found (see tools.ts)
					if(parent.getParents().includes(o))
						throw o.getFirstToken().error('Cycle detected' + (o.name.content ? ' ('+
									nParent.getParents().getPairwise().map(([b,a]) => a.name.content+' needs '+b.name.content).join(', ')+')' : '')
								+ ' : cannot resolve type, please add annotations.');
					filterUndef(findVarsUsed(o).map(x => x instanceof ParserSPL.FunCall ? findByName(x.name.content) : undefined))
											   .forEach(x => anyCycle(x, nParent, tree));
				};
				(listFunDecls = listFunDecls.sort((a,b) => {
								let treeA = new SimpleUniqueTree<ParserSPL.FunDecl>();
								anyCycle(a, treeA, treeA);
								let treeB = new SimpleUniqueTree<ParserSPL.FunDecl>();
								anyCycle(b, treeB, treeB);
								let [la, lb] = [treeA.getOrderedItems().length, treeB.getOrderedItems().length];
								return la==lb ? 0 : la>lb ? -1 : 1;
							}));
				let map = new Map(listFunDecls.map((a) => {
					let treeA = new SimpleUniqueTree<ParserSPL.FunDecl>();
					anyCycle(a, treeA, treeA);
					return Tuple(a, treeA.getOrderedItems());
				}));// b in map[a] means 'a' needs to be before 'b'

				listFunDecls = listFunDecls.sort((a,b) => {
					let [A, B] = [map.get(a),map.get(b)];
					if(!A || !B) throw "NOPE";
					return A.includes(b) ? 1 : B.includes(a) ? -1 : 0;
				});
			// ************************************ (Non nctx altering part /end)

			debugger;
			// ************ type and declare everything (fun decl, var decl, statements)
				o.varDecls.forEach(nctx.typeOf, nctx);
				listFunDecls.reverse().forEach(d => {
					nctx.typeOf(d);
					nctx.declareValue(d.name.content, d);
				});
				o.Stmt.forEach(nctx.typeOf, nctx); // eval type of statements
			// ************ end type and delcare...
			debugger;

			// *** just unify begin
				let returns = o.getReturnPaths();
				if(!returns)
					throw o.error("No any return statment found");
				let retTypes = filterUndef([...returns.concl, ...returns.maybe].map(o => o.exp ? 
								Let(nctx.typeOf(o.exp), t => t ? Tuple(t, o) : undefined) : undefined))
										.map(([[a,],b]) => Tuple(a,b));
				let errUnify = (a: Type, b: Type) => a.internalUnifyWith(b) instanceof ErrorUnifying;
				let error = retTypes.getPairwise().find(([[a,], [b,]]) => errUnify(a, b) || errUnify(b, a));
				if(error)
					throw Let(error, ([[t1,f],[t2,]]) => f.error("Can't unify return type "+t1+" with "+t2));
				t = <FunctionType>t.replace(t.output, retTypes.sort(([a,],[b,]) => ordLexOrder(a.lexOrder(), b.lexOrder())).reverse()[0][0]);
				t = nctx.replacements.reduce((t, [a,b]) => <FunctionType>t.replace(a, b), t);
			// *** just unify end
			debugger;

			return [t, nctx, []];
		}
	]
);