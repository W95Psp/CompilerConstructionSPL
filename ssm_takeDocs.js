r = $('h2').toArray().filter(o => o.innerText[0]=='S').map(o => {
    let list = [];
    let c = $(o).next()[0];
    while(c && c.nodeName != 'H2'){
         if(c.nodeName.toLowerCase() == 'blockquote')
         	list.push(c);
         c = $(c).next()[0];
    };
    let [table, description, prePost, example] = list;
    [instr, nbInlineInputs, nbStackInputs, nbStackResults, instrCode] = $(table).find('tr')[1].innerText.split(/\t/);
    description = $(description).text();
    example = $(example).text();

	return {instr, nbInlineInputs, nbStackInputs, nbStackResults, instrCode, description, prePost, example};
});

firstPart = 'let all = {'+r.map(({instr, nbInlineInputs, nbStackInputs, nbStackResults, instrCode, description, prePost, example}) => {
	let chars = 'abcdefgh';

	nbInlineInputs = +nbInlineInputs;
	nbStackInputs = +nbStackInputs;
	nbStackResults = +nbStackResults;

	let args = new Array(nbInlineInputs).fill(0).map((_,i) => chars[i]+': any').join(', ');
	let argsName = new Array(nbInlineInputs).fill(0).map((_,i) => chars[i]).join(', ');
	let fun = instr+`: {
		nbInlineInputs: ${nbInlineInputs},	nbStackInputs: ${nbStackInputs},
		nbStackResults: ${nbStackResults},	instrCode: "${instrCode}",			name: "${instr}",
		/** ${description.replace(/\n+/g,' ')} */
		f: function(${args}){return [this["${instr}"], ${argsName}]}
	}`;
	return fun;
}).join(', \n')+'}\n\n';

firstPart += r.map(({instr, nbInlineInputs, nbStackInputs, nbStackResults, instrCode, description, prePost, example}) => {
	let fun = `export let ${instr} = all.${instr}.f;`;
	return fun;
}).join('\n');

console.log(firstPart);