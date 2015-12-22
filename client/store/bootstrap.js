const co = require('co');

const {bootstrap: bootstrapRoutes} = require('./routes');


module.exports = function(store) {

    return co(function* () {

        yield bootstrapRoutes(store);

        return store;

    }).catch(function(err) {
        // TODO: proper error logging
        console.error(err);
        console.error(err.stack);
    });

};
