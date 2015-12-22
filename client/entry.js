require('babel-polyfill');

// see: https://github.com/babel/babel-loader#custom-polyfills-eg-promise-library
require('babel-runtime/core-js/promise').default = require('bluebird');

// see: https://github.com/petkaantonov/bluebird/blob/master/API.md#promiselongstacktraces---void
require('bluebird').longStackTraces();

// const scriptjs = require('scriptjs');
// const co = require('co');
// const superhot = require('store/superhot');
// const _ = require('lodash');

// co(function*() {
//     const response = yield new Promise(function(resolve) {
//         superhot.get('/env').end(function(err, res){
//             resolve(res);
//         });
//     });

//     const env = response.body;

//     let hasLocalMathJax = false;
//     if(_.has(env, 'local_mathjax') && env.local_mathjax) {

//         const _response = yield new Promise(function(resolve) {
//             superhot.get('/mathjax/MathJax.js').end(function(err, res){
//                 resolve(res);
//             });
//         });

//         hasLocalMathJax = _response.status == 200;
//     }

//     const mjscript = hasLocalMathJax ? 'mathjax/MathJax.js?config=TeX-AMS-MML_HTMLorMML' :
//         'https://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML';

//     scriptjs(mjscript, function() {
//         require('./index.js');
//     });

// });

require('./index.js');

