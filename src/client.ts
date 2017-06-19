import * as fs from 'fs';
import {SPL_compile} from './SPL';

// let file = process.argv[1];

(<any>global).SPL_compile=SPL_compile;
// let out = SPL_compile('');

// console.log(out);