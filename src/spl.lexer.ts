import {Lexer, Token, DeterministicToken} from './lexer';

export class SPL_Lexer extends Lexer {}

export class MultilineComment		extends Token {}				SPL_Lexer.register (MultilineComment		, /\/\*[\s\S]*?\*\//y, true);
export class SinglelineComment		extends Token {}				SPL_Lexer.register (SinglelineComment		, /\/\/.*/yi, true);
export class Str					extends Token {}				SPL_Lexer.register (Str						, /\b".*?"\b/yi);
export class Integer				extends Token {}				SPL_Lexer.register (Integer					, /\b\d+\b/y);
export class Arrow					extends DeterministicToken {}	SPL_Lexer.registerd(Arrow					, '->');
export class DoubleColons			extends DeterministicToken {}	SPL_Lexer.registerd(DoubleColons			, '::');
export class Void					extends DeterministicToken {}	SPL_Lexer.registerd(Void					, 'Void');
export class BasicType				extends Token {}				SPL_Lexer.register (BasicType				, /\b(Int|Bool|Char)\b/y);
export class If						extends DeterministicToken {}	SPL_Lexer.registerd(If						, 'if');
export class FieldOperators			extends Token {}				SPL_Lexer.register (FieldOperators			, /\b(hd|tl|fst|snd)\b/y);
export class Else					extends DeterministicToken {}	SPL_Lexer.registerd(Else					, 'else');
export class While					extends DeterministicToken {}	SPL_Lexer.registerd(While					, 'while');
export class Return					extends DeterministicToken {}	SPL_Lexer.registerd(Return					, 'return');
export class Bool					extends Token {}				SPL_Lexer.register (Bool					, /\b(False|True)\b/y);
export class Var					extends DeterministicToken {}	SPL_Lexer.registerd(Var						, 'var');
export class Id						extends Token {
	static generateRand(deth=0){
		let s = 'var'+Math.round(Math.random()*1000+1000);
		return new this(0, s.length, s, <Lexer>{});
	}
	static content = 'var';
}																		SPL_Lexer.register (Id						, /\b[a-z][_a-z0-9]*\b/yi);
export class Semicolon				extends DeterministicToken {}	SPL_Lexer.registerd(Semicolon				, ';');
export class Comma					extends DeterministicToken {}	SPL_Lexer.registerd(Comma					, ',');
export class Dot					extends DeterministicToken {}	SPL_Lexer.registerd(Dot						, '.');
export class OpeningParenthesis		extends DeterministicToken {}	SPL_Lexer.registerd(OpeningParenthesis		, '(', false, ClosingParenthesis);
OpeningParenthesis.ignoreTooMuchPairs = true;
export class ClosingParenthesis		extends DeterministicToken {}	SPL_Lexer.registerd(ClosingParenthesis		, ')', false, OpeningParenthesis);
export class OpeningCurlyBracket	extends DeterministicToken {}	SPL_Lexer.registerd(OpeningCurlyBracket		, '{', false, ClosingCurlyBracket);
export class ClosingCurlyBracket	extends DeterministicToken {}	SPL_Lexer.registerd(ClosingCurlyBracket		, '}', false, OpeningCurlyBracket);
export class OpeningBracket			extends DeterministicToken {}	SPL_Lexer.registerd(OpeningBracket			, '[', false, ClosingBracket);
export class ClosingBracket			extends DeterministicToken {}	SPL_Lexer.registerd(ClosingBracket			, ']', false, OpeningBracket);
export class UnaryOrBinaryOperator	extends DeterministicToken {}	SPL_Lexer.registerd(UnaryOrBinaryOperator	, '-');
export class BinaryOperator			extends Token {}				SPL_Lexer.register (BinaryOperator			, /(\+|-|\*|\/|%|==|<=|>=|!=|&&|\|\||\:|<|>)/y);
export class UnaryOperator			extends DeterministicToken {}	SPL_Lexer.registerd(UnaryOperator			, '!');
export class Equal					extends DeterministicToken {}	SPL_Lexer.registerd(Equal					, '=');
export class Space					extends Token {}				SPL_Lexer.register (Space					, /\s+/y, true);