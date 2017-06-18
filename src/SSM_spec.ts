import {flatten} from './tools';

let all = {add: {
		nbInlineInputs: 0,	nbStackInputs: 2,
		nbStackResults: 1,	instrCode: "1",			name: "add",
		/** Addition. Replaces 2 top stack values with the addition of those values. */
		f: function():string[]{return ["add", ]}
	}, 
ajs: {
		nbInlineInputs: 1,	nbStackInputs: NaN,
		nbStackResults: 0,	instrCode: "0x64",			name: "ajs",
		/** Adjust Stack. Adjusts the stackpointer with fixed amount. */
		f: function(a: any):string[]{return ["ajs", a]}
	}, 
and: {
		nbInlineInputs: 0,	nbStackInputs: 2,
		nbStackResults: 1,	instrCode: "2",			name: "and",
		/** And. Replaces 2 top stack values with the bitwise and of those values. */
		f: function():string[]{return ["and", ]}
	}, 
annote: {
		nbInlineInputs: 5,	nbStackInputs: 0,
		nbStackResults: 0,	instrCode: "0xff",			name: "annote",
		/** Annotate. A meta instruction (not producing code), annotating the stack display in the user interface with text and color. Annote takes 5 arguments, (1) a register name, (2) a low offset w.r.t. the register (used as starting point for annotating), (3) a high offset, (4) a color, (5) text. Color can be one of {black, blue, cyan, darkGray, gray, green, lightGray, magenta, orange, pink, red, yellow}. Text including spaces need to be enclosed in double quotes. The annote instruction is tied to the preceding (non-meta) instruction and will be performed immediately after the execution of that instruction. */
		f: function(a: any, b: any, c: any, d: any, e: any):string[]{return ["annote", a, b, c, d, e]}
	}, 
bra: {
		nbInlineInputs: 1,	nbStackInputs: 0,
		nbStackResults: 0,	instrCode: "0x68",			name: "bra",
		/** Branch Allways. Jumps to the destination. Replaces the PC with the destination address. */
		f: function(a: any):string[]{return ["bra", a]}
	}, 
brf: {
		nbInlineInputs: 1,	nbStackInputs: 1,
		nbStackResults: 0,	instrCode: "0x6c",			name: "brf",
		/** Branch on False. If a False value is on top of the stack, jump to the destination. */
		f: function(a: any):string[]{return ["brf", a]}
	}, 
brt: {
		nbInlineInputs: 1,	nbStackInputs: 1,
		nbStackResults: 0,	instrCode: "0x6d",			name: "brt",
		/** Branch on True. If a True value is on top of the stack, jump to the destination. */
		f: function(a: any):string[]{return ["brt", a]}
	}, 
bsr: {
		nbInlineInputs: 1,	nbStackInputs: 0,
		nbStackResults: 1,	instrCode: "0x70",			name: "bsr",
		/** Branch to subroutine. Pushes the PC on the stack and jumps to the subroutine. */
		f: function(a: any):string[]{return ["bsr", a]}
	}, 
div: {
		nbInlineInputs: 0,	nbStackInputs: 2,
		nbStackResults: 1,	instrCode: "4",			name: "div",
		/** Division. Replaces 2 top stack values with the division of those values. */
		f: function():string[]{return ["div", ]}
	}, 
eq: {
		nbInlineInputs: 0,	nbStackInputs: 2,
		nbStackResults: 1,	instrCode: "0xe",			name: "eq",
		/** Test for equal. Replaces 2 top stack values with boolean result of the test. False is encoded as 0, True as 1. Used in combination with brf. This is a variant of cmp combined with beq. */
		f: function():string[]{return ["eq", ]}
	}, 
ge: {
		nbInlineInputs: 0,	nbStackInputs: 2,
		nbStackResults: 1,	instrCode: "0x13",			name: "ge",
		/** Test for greater or equal. Replaces 2 top stack values with boolean result of the test. False is encoded as 0, True as 1. Used in combination with brf. This is a variant of cmp combined with bge. */
		f: function():string[]{return ["ge", ]}
	}, 
gt: {
		nbInlineInputs: 0,	nbStackInputs: 2,
		nbStackResults: 1,	instrCode: "0x11",			name: "gt",
		/** Test for greater then. Replaces 2 top stack values with boolean result of the test. False is encoded as 0, True as 1. Used in combination with brf. This is a variant of cmp combined with bgt. */
		f: function():string[]{return ["gt", ]}
	}, 
halt: {
		nbInlineInputs: 0,	nbStackInputs: 0,
		nbStackResults: 0,	instrCode: "0x74",			name: "halt",
		/** Halt execution. Machine stops executing instructions. */
		f: function():string[]{return ["halt", ]}
	}, 
jsr: {
		nbInlineInputs: 0,	nbStackInputs: 1,
		nbStackResults: 1,	instrCode: "0x78",			name: "jsr",
		/** Jump to subroutine. Pops a destination from the stack, pushes the PC on the stack and jumps to the destination. */
		f: function():string[]{return ["jsr", ]}
	}, 
lda: {
		nbInlineInputs: 1,	nbStackInputs: 1,
		nbStackResults: 1,	instrCode: "0x7c",			name: "lda",
		/** Load via Address. Dereferencing. Pushes the value pointed to by the value at the top of the stack. The pointer value is offset by a constant offset. */
		f: function(a: any):string[]{return ["lda", a]}
	}, 
ldaa: {
		nbInlineInputs: 1,	nbStackInputs: 1,
		nbStackResults: 1,	instrCode: "0x80",			name: "ldaa",
		/** Load Address of Address. Pushes the address of a value relative to the address on top of the stack. This instruction effectively adds a constant to the top of the stack. */
		f: function(a: any):string[]{return ["ldaa", a]}
	}, 
ldc: {
		nbInlineInputs: 1,	nbStackInputs: 0,
		nbStackResults: 1,	instrCode: "0x84",			name: "ldc",
		/** Load Constant. Pushes the inline constant on the stack. */
		f: function(a: any):string[]{return ["ldc", a]}
	}, 
ldh: {
		nbInlineInputs: 1,	nbStackInputs: 1,
		nbStackResults: 1,	instrCode: "0xd0",			name: "ldh",
		/** Load from Heap. Pushes a value pointed to by the value at the top of the stack. The pointer value is offset by a constant offset. */
		f: function(a: any):string[]{return ["ldh", a]}
	}, 
ldl: {
		nbInlineInputs: 1,	nbStackInputs: 0,
		nbStackResults: 1,	instrCode: "0x88",			name: "ldl",
		/** Load Local. Pushes a value relative to the markpointer. */
		f: function(a: any):string[]{return ["ldl", a]}
	}, 
ldla: {
		nbInlineInputs: 1,	nbStackInputs: 0,
		nbStackResults: 1,	instrCode: "0x8c",			name: "ldla",
		/** Load Local Address. Pushes the address of a value relative to the markpointer. */
		f: function(a: any):string[]{return ["ldla", a]}
	}, 
ldma: {
		nbInlineInputs: 2,	nbStackInputs: 1,
		nbStackResults: NaN,	instrCode: "0x7e",			name: "ldma",
		/** Load Multiple via Address. Pushes values relative to by the value at the top of the stack. Same as single load variant but second inline parameter is size. */
		f: function(a: any, b: any):string[]{return ["ldma", a, b]}
	}, 
ldmh: {
		nbInlineInputs: 2,	nbStackInputs: 1,
		nbStackResults: NaN,	instrCode: "0xd4",			name: "ldmh",
		/** Load Multiple from Heap. Pushes values pointed to by the value at the top of the stack. The pointer value is offset by a constant offset. Same as single load variant but the second inline parameter is size. */
		f: function(a: any, b: any):string[]{return ["ldmh", a, b]}
	}, 
ldml: {
		nbInlineInputs: 2,	nbStackInputs: 0,
		nbStackResults: NaN,	instrCode: "0x8a",			name: "ldml",
		/** Load Multiple Local. Pushes values relative to the markpointer. Same as single load variant but second inline parameter is size. */
		f: function(a: any, b: any):string[]{return ["ldml", a, b]}
	}, 
ldms: {
		nbInlineInputs: 2,	nbStackInputs: 0,
		nbStackResults: NaN,	instrCode: "0x9a",			name: "ldms",
		/** Load Multiple from Stack. Pushes values relative to the top of the stack. Same as single load variant but second inline parameter is size. */
		f: function(a: any, b: any):string[]{return ["ldms", a, b]}
	}, 
ldr: {
		nbInlineInputs: 1,	nbStackInputs: 0,
		nbStackResults: 1,	instrCode: "0x90",			name: "ldr",
		/** Load Register. Pushes a value from a register. Registers 0, 1, 2 and 3 are called PC (programcounter), SP (stackpointer), MP (markpointer) and RR (return register) respectively. */
		f: function(a: any):string[]{return ["ldr", a]}
	}, 
ldrr: {
		nbInlineInputs: 2,	nbStackInputs: 0,
		nbStackResults: 0,	instrCode: "0x94",			name: "ldrr",
		/** Load Register from Register. Copy the content of the second register to the first. Does not affect the stack. */
		f: function(a: any, b: any):string[]{return ["ldrr", a, b]}
	}, 
lds: {
		nbInlineInputs: 1,	nbStackInputs: 0,
		nbStackResults: 1,	instrCode: "0x98",			name: "lds",
		/** Load from Stack. Pushes a value relative to the top of the stack. */
		f: function(a: any):string[]{return ["lds", a]}
	}, 
ldsa: {
		nbInlineInputs: 1,	nbStackInputs: 0,
		nbStackResults: 1,	instrCode: "0x9c",			name: "ldsa",
		/** Load Stack Address. Pushes the address of a value relative to the stackpointer. */
		f: function(a: any):string[]{return ["ldsa", a]}
	}, 
le: {
		nbInlineInputs: 0,	nbStackInputs: 2,
		nbStackResults: 1,	instrCode: "0x12",			name: "le",
		/** Test for less or equal. Replaces 2 top stack values with boolean result of the test. False is encoded as 0, True as 1. Used in combination with brf. This is a variant of cmp combined with ble. */
		f: function():string[]{return ["le", ]}
	}, 
link: {
		nbInlineInputs: 1,	nbStackInputs: 0,
		nbStackResults: NaN,	instrCode: "0xa0",			name: "link",
		/** Reserve memory for locals. Convenience instruction combining the push of MP and the adjustment of the SP. */
		f: function(a: any):string[]{return ["link", a]}
	}, 
lt: {
		nbInlineInputs: 0,	nbStackInputs: 2,
		nbStackResults: 1,	instrCode: "0x10",			name: "lt",
		/** Test for less then. Replaces 2 top stack values with boolean result of the test. False is encoded as 0, True as 1. Used in combination with brf. This is a variant of cmp combined with blt. */
		f: function():string[]{return ["lt", ]}
	}, 
mod: {
		nbInlineInputs: 0,	nbStackInputs: 2,
		nbStackResults: 1,	instrCode: "7",			name: "mod",
		/** Division. Replaces 2 top stack values with the modulo of those values. */
		f: function():string[]{return ["mod", ]}
	}, 
mul: {
		nbInlineInputs: 0,	nbStackInputs: 2,
		nbStackResults: 1,	instrCode: "8",			name: "mul",
		/** Multiplication. Replaces 2 top stack values with the multiplication of those values. */
		f: function():string[]{return ["mul", ]}
	}, 
ne: {
		nbInlineInputs: 0,	nbStackInputs: 2,
		nbStackResults: 1,	instrCode: "0xf",			name: "ne",
		/** Test for not equal. Replaces 2 top stack values with boolean result of the test. False is encoded as 0, True as 1. Used in combination with brf. This is a variant of cmp combined with bne. */
		f: function():string[]{return ["ne", ]}
	}, 
neg: {
		nbInlineInputs: 0,	nbStackInputs: 1,
		nbStackResults: 1,	instrCode: "0x20",			name: "neg",
		/** Negation. Replaces top stack values with the (integer) negative of the value. */
		f: function():string[]{return ["neg", ]}
	}, 
nop: {
		nbInlineInputs: 0,	nbStackInputs: 0,
		nbStackResults: 0,	instrCode: "0xa4",			name: "nop",
		/** No operation. Well, guess what... */
		f: function():string[]{return ["nop", ]}
	}, 
not: {
		nbInlineInputs: 0,	nbStackInputs: 1,
		nbStackResults: 1,	instrCode: "0x21",			name: "not",
		/** Not. Replaces top stack values with the bitwise complement of the value. */
		f: function():string[]{return ["not", ]}
	}, 
or: {
		nbInlineInputs: 0,	nbStackInputs: 2,
		nbStackResults: 1,	instrCode: "9",			name: "or",
		/** Or. Replaces 2 top stack values with the bitwise or of those values. */
		f: function():string[]{return ["or", ]}
	}, 
ret: {
		nbInlineInputs: 0,	nbStackInputs: 1,
		nbStackResults: 0,	instrCode: "0xa8",			name: "ret",
		/** Return from subroutine. Pops a previously pushed PC from the stack and jumps to it. */
		f: function():string[]{return ["ret", ]}
	}, 
sta: {
		nbInlineInputs: 1,	nbStackInputs: 2,
		nbStackResults: 0,	instrCode: "0xac",			name: "sta",
		/** Store via Address. Pops 2 values from the stack and stores the second popped value in the location pointed to by the first. The pointer value is offset by a constant offset. */
		f: function(a: any):string[]{return ["sta", a]}
	}, 
sth: {
		nbInlineInputs: 0,	nbStackInputs: 1,
		nbStackResults: 1,	instrCode: "0xd6",			name: "sth",
		/** Store into Heap. Pops 1 value from the stack and stores it into the heap. Pushes the heap address of that value on the stack. */
		f: function():string[]{return ["sth", ]}
	}, 
stl: {
		nbInlineInputs: 1,	nbStackInputs: 1,
		nbStackResults: 0,	instrCode: "0xb0",			name: "stl",
		/** Store Local. Pops a value from the stack and stores it in a location relative to the markpointer. */
		f: function(a: any):string[]{return ["stl", a]}
	}, 
stma: {
		nbInlineInputs: 2,	nbStackInputs: NaN,
		nbStackResults: 0,	instrCode: "0xae",			name: "stma",
		/** Store Multiple via Address. Pops values from the stack and stores it in a location relative to the value at the top of the stack. Same as single store variant but second inline parameter is size. */
		f: function(a: any, b: any):string[]{return ["stma", a, b]}
	}, 
stmh: {
		nbInlineInputs: 1,	nbStackInputs: NaN,
		nbStackResults: 1,	instrCode: "0xd8",			name: "stmh",
		/** Store Multiple into Heap. Pops values from the stack and stores it into the heap, retaining the order of the values. Same as single store variant but the inline parameter is size. Pushes the heap address of the last value on the stack. */
		f: function(a: any):string[]{return ["stmh", a]}
	}, 
stml: {
		nbInlineInputs: 2,	nbStackInputs: NaN,
		nbStackResults: 0,	instrCode: "0xb2",			name: "stml",
		/** Store Multiple Local. Pops values from the stack and stores it in a location relative to the markpointer. Same as single store variant but second inline parameter is size. */
		f: function(a: any, b: any):string[]{return ["stml", a, b]}
	}, 
stms: {
		nbInlineInputs: 2,	nbStackInputs: NaN,
		nbStackResults: 0,	instrCode: "0xba",			name: "stms",
		/** Store Multiple into Stack. Pops values from the stack and stores it in a location relative to the top of the stack. Same as single store variant but second inline parameter is size. */
		f: function(a: any, b: any):string[]{return ["stms", a, b]}
	}, 
str: {
		nbInlineInputs: 1,	nbStackInputs: 1,
		nbStackResults: 0,	instrCode: "0xb4",			name: "str",
		/** Store Register. Pops a value from the stack and stores it in the specified register. See also ldr. */
		f: function(a: any):string[]{return ["str", a]}
	}, 
sts: {
		nbInlineInputs: 1,	nbStackInputs: 1,
		nbStackResults: 0,	instrCode: "0xb8",			name: "sts",
		/** Store into Stack. Pops a value from the stack and stores it in a location relative to the top of the stack. */
		f: function(a: any):string[]{return ["sts", a]}
	}, 
sub: {
		nbInlineInputs: 0,	nbStackInputs: 2,
		nbStackResults: 1,	instrCode: "0xc",			name: "sub",
		/** Substraction. Replaces 2 top stack values with the subtraction of those values. */
		f: function():string[]{return ["sub", ]}
	}, 
swp: {
		nbInlineInputs: 0,	nbStackInputs: 2,
		nbStackResults: 2,	instrCode: "0xbc",			name: "swp",
		/** Swap values. Swaps the 2 topmost values on the stack. */
		f: function():string[]{return ["swp", ]}
	}, 
swpr: {
		nbInlineInputs: 1,	nbStackInputs: 1,
		nbStackResults: 1,	instrCode: "0xc0",			name: "swpr",
		/** Swap Register. Swaps the content of a register with the top of the stack. */
		f: function(a: any):string[]{return ["swpr", a]}
	}, 
swprr: {
		nbInlineInputs: 2,	nbStackInputs: 0,
		nbStackResults: 0,	instrCode: "0xc4",			name: "swprr",
		/** Swap 2 Registers. Swaps the content of a register with another register. */
		f: function(a: any, b: any):string[]{return ["swprr", a, b]}
	}, 
trap: {
		nbInlineInputs: 1,	nbStackInputs: NaN,
		nbStackResults: NaN,	instrCode: "0xc8",			name: "trap",
		/** Trap to environment function. Trap invokes a systemcall determined by its argument. Currently, trap supports the following system calls:  Pop the topmost element from the stack and print it as an integer. Pop the topmost element from the stack and print it as a unicode character. Ask the user for an integer input and push it on the stack. Ask the user for a unicode character input and push it on the stack. Ask the user for a sequence of unicode characters input and push the characters on the stack terminated by a null-character. Pop a null-terminated file name from the stack, open the file for reading and push a file pointer on the stack. Pop a null-terminated file name from the stack, open the file for writing and push a file pointer on the stack. Pop a file pointer from the stack, read a character from the file pointed to by the file pointer and push the character on the stack. Pop a character and a file pointer from the stack, write the character to the file pointed to by the file pointer. Pop a file pointer from the stack and close the corresponding file.  */
		f: function(a: any):string[]{return ["trap", a]}
	}, 
unlink: {
		nbInlineInputs: 0,	nbStackInputs: NaN,
		nbStackResults: 0,	instrCode: "0xcc",			name: "unlink",
		/** Free memory for locals. Convenience instruction combining the push of MP and the adjustment of the SP. */
		f: function():string[]{return ["unlink", ]}
	}, 
xor: {
		nbInlineInputs: 0,	nbStackInputs: 2,
		nbStackResults: 1,	instrCode: "0xd",			name: "xor",
		/** Exclusive Or. Replaces 2 top stack values with the bitwise exclusive or of those values. */
		f: function():string[]{return ["xor", ]}
	}}

export let add		= all.add.f;
export let ajs		= all.ajs.f;
export let and		= all.and.f;
export let annote	= all.annote.f;
export let bra		= all.bra.f;
export let brf		= all.brf.f;
export let brt		= all.brt.f;
export let bsr		= all.bsr.f;
export let div		= all.div.f;
export let eq		= all.eq.f;
export let ge		= all.ge.f;
export let gt		= all.gt.f;
export let halt		= all.halt.f;
export let jsr		= all.jsr.f;
export let lda		= all.lda.f;
export let ldaa		= all.ldaa.f;
export let ldc		= all.ldc.f;
export let ldh		= all.ldh.f;
export let ldl		= all.ldl.f;
export let ldla		= all.ldla.f;
export let ldma		= all.ldma.f;
export let ldmh		= all.ldmh.f;
export let ldml		= all.ldml.f;
export let ldms		= all.ldms.f;
export let ldr		= all.ldr.f;
export let ldrr		= all.ldrr.f;
export let lds		= all.lds.f;
export let ldsa		= all.ldsa.f;
export let le		= all.le.f;
export let link		= all.link.f;
export let lt		= all.lt.f;
export let mod		= all.mod.f;
export let mul		= all.mul.f;
export let ne		= all.ne.f;
export let neg		= all.neg.f;
export let nop		= all.nop.f;
export let not		= all.not.f;
export let or		= all.or.f;
export let ret		= all.ret.f;
export let sta		= all.sta.f;
export let sth		= all.sth.f;
export let stl		= all.stl.f;
export let stma		= all.stma.f;
export let stmh		= all.stmh.f;
export let stml		= all.stml.f;
export let stms		= all.stms.f;
export let str		= all.str.f;
export let sts		= all.sts.f;
export let sub		= all.sub.f;
export let swp		= all.swp.f;
export let swpr		= all.swpr.f;
export let swprr	= all.swprr.f;
export let trap		= all.trap.f;
export let unlink	= all.unlink.f;
export let xor		= all.xor.f;

export let label	= (label: string, code: string[]) => [label+':', ...code];
export let sizeOf	= (prog: string[][]) => flatten(prog).filter(o => o.substr(-1)!=':');
export let toString	= (prog: string[][]) => prog.map(o => o.join(' ')).join('\n');
export let printConsole	= (prog: string[][]) => prog.map(o => 
		console.log((o[0].includes('?') ? '%c' : '') + o.join(' '), (o[0].includes('?') ? 'background: #F00;' : '')));