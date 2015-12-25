// copied from: https://github.com/facebook/react/issues/4917#issuecomment-141906477

function symbol(props, propName, componentName) {
    const prop = props[propName];
    if (prop && (typeof prop !== 'symbol')) {
        return new Error(`[${componentName}]: Expected property ${propName} to be a Symbol, but its actual type is ${typeof prop}.`);
    }
}

symbol.isRequired = function(props, propName, componentName) {
    return props[propName] ?
           symbol(props, propName, componentName) :
           new Error(`[${componentName}]: Property ${propName} is required.`);
};

module.exports = {
    symbol: symbol
};
