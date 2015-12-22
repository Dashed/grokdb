// https://github.com/medikoo/es6-symbol/blob/a665c611b96c72b177f70d2e5c253e2e0a2f22cc/is-symbol.js

module.exports = function (x) {
    return (x && ((typeof x === 'symbol') || (x['@@toStringTag'] === 'Symbol'))) || false;
};
