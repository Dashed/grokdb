require('babel-polyfill');

// see: https://github.com/babel/babel-loader#custom-polyfills-eg-promise-library
require('babel-runtime/core-js/promise').default = require('bluebird');

// see: https://github.com/petkaantonov/bluebird/blob/master/API.md#promiselongstacktraces---void
require('bluebird').longStackTraces();

require('./index.js');
