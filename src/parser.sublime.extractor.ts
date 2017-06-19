import {CatTuple,Let,Predicate,SimpleTree,SimpleUniqueTree,Tuple,Tuple3,escapeRegExp,filterUndef,flatten,isChildOf,print,rnd} from './tools';
import {ParserRule,ParserRuleComplexStep,ParserRuleIgnoreStep,ParserRuleStep,Parser} from './parser';
import * as Lexer from './lexer';
import * as SPL from './spl.parser';

interface context {
	name: string,
	rules: rule[]
};
interface rule {
	match: string,
	push?: string | string[],
	scope?: string,
	pop?: boolean,
	set: string[]
};
var YAML = require('yamljs');
let ParserRule_2_grammar = (rule: typeof ParserRule) => {
	let name = rule.name;
	let steps = rule.steps;
	let contextes: context[] = [];

	// for(let [i,step] of steps.entries()){
	// 	let blocks = [...step.classes.entries()];

	// 	let rules = flatten(blocks.map(([token,next], j) : rule[] => {
	// 		let isLast = i==blocks.length-1;
	// 		if(next==true){//match a token
	// 			return [{
	// 				match: (token.regexp || '??').toString(),
	// 				scope: 'punctuation.definition.tag',
	// 				set: name+'_'+(i+1)
	// 			}];
	// 		}else{
	// 			return next.map(o => ({
	// 				match: '',
	// 				push: o.name,
	// 				set: name+'_'+(i+1)
	// 			}));
	// 		}
	// 	}));
	// 	contextes.push({
	// 		name: name+'_'+i,
	// 		rules
	// 	});
	// }
	for(let [i,step] of steps.entries()){
		let blocks = step.getPossibles();

		let rules = blocks.map((next, j) : rule => {
			let isLast = i==blocks.length-1;
			if(isChildOf(next, Lexer.Token)){//match a token
				return {
					match: (next.regexp || 'end_of_file_we_dont_care').toString(),
					scope: 'punctuation.definition.tag',
					set: [name+'_'+(i+1)]
				};
			}else{
				return {
					match: '',
					set: [name+'_'+(i+1), next.name+'_'+0]
				};
			}
		});
		contextes.push({
			name: name+'_'+i,
			rules: [...rules, {match: /[^ \t]/.toString(), set: [], pop: true}]
		});
	}
	contextes[contextes.length-1].rules.forEach(r => r.set.splice(0,1));
	return contextes;
}

let contextes =  flatten(SPL.SPL_Parser.rules.map(o => ParserRule_2_grammar(o)));
let final: {[id: string] : rule[]} = {};
contextes.forEach(({name, rules}) => final[name] = rules);

let out = YAML.stringify(final, 4);

console.log(out.replace('SPL_0', 'main'));