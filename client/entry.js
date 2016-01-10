require('babel-polyfill');

// see: https://github.com/babel/babel-loader#custom-polyfills-eg-promise-library
require('babel-runtime/core-js/promise').default = require('bluebird');

// see: https://github.com/petkaantonov/bluebird/blob/master/API.md#promiselongstacktraces---void
require('bluebird').longStackTraces();

// superagent proxy
const superhot = require('store/superhot');
const littleloader = require('little-loader');

new Promise(function(resolve) {

    // check if mathjax assets exist

    superhot.get('/mathjax/MathJax.js').end(function(err, response){
        resolve(response.status == 200);
    });

}).then(function(hasLocalMathJax) {

    const mjscript = hasLocalMathJax ? '/mathjax/MathJax.js?config=TeX-AMS-MML_HTMLorMML' :
        'https://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML';

    littleloader(mjscript, function (err) {

        if(err) {
            console.error(err);
        }

        require('./index.js');
    });

    // silence bluebird warning
    return null;
});
