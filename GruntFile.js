module.exports = function (grunt) {
    grunt.registerTask('ts', '', function() {
        require('child_process').execSync('tsc', {stdio:[0,1,2]});
    });
    grunt.registerTask('moveClasses', '', function() {
        let fs = require('fs');
        grunt.file.recurse('build', path => {
            let content = fs.readFileSync(path).toString();
            let re = /(?:let\s+\w+\s*=\s*)?class .*\{\r?\n?(?:(?:    |\t).*\r?\n?)*\}/g;
            // let re = /class .*\{\r?\n?\}/g;
            let classes = (content.match(re)||[]).join('\n');
            let first = true;
            let ncontent = content.replace(re, (o) => {
                if(!first)
                    return '';
                first = false;
                return classes;
            });
            fs.writeFileSync(path, ncontent);
        });
    });
    grunt.registerTask('preCompile', '', function() {
        let fs = require('fs');
        grunt.file.recurse('ts-build', path => {
            let content = fs.readFileSync(path).toString();
            // blabla?: (LexSPL.Arrow | LexSPL.Arrow)[];
            let ncontent = content.replace(/(\.add(?:Opt)?Step)\(\)[\s\r\n]*(\s*(\w*)(\??)\s*\:\s*(.*?);)/g, (all, decoCall, decl, pname, opt, type) => {
                let match = type.match(/\(?([^[]*)\)?\s*(\[\s*\])?/);
                if(!match)
                    throw all;
                let types = match[1].match(/(\w+(?:\.\w+)?)/g).join(', ');
                let isList = match[2] ? 'true' : 'false';
                // console.log(pname, types, match[2], isList);
                // let isOpt = opt ? 'false' : 'true';
                return decoCall+'(' + isList + ', ' + types + ')\n'+decl;
            });
            fs.writeFileSync(path, ncontent);
        });
    });

    grunt.registerTask('launch', '', function() {
        require('child_process').execSync('cd build; node main.js', {stdio:[0,1,2]});
    });
    grunt.registerTask('browserify', '', function() {
        require('child_process').execSync('cd build; browserify client.js -o bundle.js', {stdio:[0,1,2]});
    });
    grunt.registerTask('launch-dbg', '', function() {
        require('child_process').execSync('cd build; node --inspect-brk main.js', {stdio:[0,1,2]});
    });
    grunt.loadNpmTasks('grunt-contrib-copy');
 
    grunt.registerTask('default', ['ts', 'moveClasses']);

    grunt.initConfig({
        copy: {
            test: {expand: true, cwd: 'src', src: ['**'], dest: 'ts-build'}
        }
    });

    grunt.registerTask('run', ['copy', 'preCompile', 'ts', 'moveClasses', 'launch']);
    grunt.registerTask('debug', ['copy', 'preCompile', 'ts', 'moveClasses', 'launch-dbg']);
    grunt.registerTask('html', ['copy', 'preCompile', 'ts', 'moveClasses', 'browserify']);
}