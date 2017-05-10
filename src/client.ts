import * as colors from 'colors';
import * as Lexer from './lexer';
import * as Parser from './parser';
import * as LexSPL from './spl.lexer';

import * as T from './type';

import * as ParserSPL from './spl.parser';



// let a = ParserSPL.Exp.getPossibleSequence(new Map());

declare var $:any;

(<any>global).ParserSPL = ParserSPL;
(<any>global).LexSPL = LexSPL;

ParserSPL.SPL_Parser.optimize();

// let root = new Tree();


// let l = new LexSPL.SPL_Lexer(`
// 	var hey = 423;
// 	hey() {
// 		if(hey == 1){
// 			if(hey == 2){
// 				if(hey == 3){
// 					if(hey == 4){

// 					}else{
						
// 					}
// 				}else{
					
// 				}
// 			}else{
				
// 			}
// 		}else{
			
// 		}
// 	}
// `);
// let p = new ParserSPL.SPL_Parser(l.tokenDeck);
// console.log(p);

let f = (s:any) => new ParserSPL.SPL_Parser((new LexSPL.SPL_Lexer(s)).tokenDeck);
let g = (n:any,s:any) => (new Array(n)).fill('(').join('') + s.toString() + (new Array(n)).fill(')').join('');


let F = (s:any) => (<any>f(s)).result.decls.filter((o:any) => o && o.content instanceof ParserSPL.FunDecl)[0].content.getType(new T.Context());


(<any>global).f = f;
(<any>global).F = F;
(<any>global).g = g;


function TEST(){
	// f(((<any>global).document).getElementById('inp').value).computeTypes();
	let R = f(((<any>global).document).getElementById('inp').value);
	console.log(R.result);
	R.computeTypes();
	if(R.result)
		console.log('\n\n'+R.result.SSM().join('\n')+'\n\n');
}
(<any>global).TEST = TEST;

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
(<any>global).TEST = TEST;

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

