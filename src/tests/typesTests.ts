
import {Type,UnknownType,ListType,FunctionType,TupleType,UnknownTypeLimited,VariableType, IntegerType, BooleanType} from '../type';
/*

let List1 = new ListType(new TupleType(new BooleanType(), new IntegerType()));
let List2 = new ListType(new TupleType(new UnknownType('list2:tuple:0'), new IntegerType()));

List1.unifyWith(List2);

*/

let TypeN = new IntegerType();
let TypeM = new UnknownType();

let unknownTypeFun = new UnknownType('a');
let TypeF = new FunctionType([unknownTypeFun], unknownTypeFun);

let toMatchF = new FunctionType([TypeN], TypeM);

TypeF.unifyWith(toMatchF);