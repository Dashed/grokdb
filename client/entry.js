require('babel-polyfill');

// see: https://github.com/babel/babel-loader#custom-polyfills-eg-promise-library
require('babel-runtime/core-js/promise').default = require('bluebird');

// see: https://github.com/petkaantonov/bluebird/blob/master/API.md#promiselongstacktraces---void
require('bluebird').longStackTraces();

// superagent proxy
const superhot = require('store/superhot');
const scriptjs = require('scriptjs');

new Promise(function(resolve) {

    superhot.get('/mathjax/MathJax.js').end(function(err, response){
        resolve(response.status == 200);
    });

}).then(function(hasLocalMathJax) {

    const mjscript = hasLocalMathJax ? '/mathjax/MathJax.js?config=TeX-AMS-MML_HTMLorMML' :
        'https://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML';

    scriptjs(mjscript, function() {
        require('./index.js');
    });

    // silence bluebird warning
    return null;
});
