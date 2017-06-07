import {ParserRule} from './parser';

// class Arrow {
// 	action: Action;

// }
// class Will extends Arrow {

// }
// class Might extends Arrow {

// }

enum Verb {
	Will,
	Might
}
enum Action {
	ReadVar,
	AssignVar,
	ExecFun,
	Return
}
type Dependency = [Verb, Action.ReadVar|Action.AssignVar|Action.ExecFun, ParserRule] | [Verb, Action.Return, ParserRule[]];
type DependenciesTree = Dependency[];

class ParserRuleReturning extends ParserRule {

}
class ParserRuleBranching extends ParserRule {

}
class ParserRuleFunDef extends ParserRule {

}
class ParserRuleVarDef extends ParserRule {

}