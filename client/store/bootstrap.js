const {bootstrap: bootstrapRoutes} = require('./routes');


module.exports = function(store) {

    return bootstrapRoutes(store)
        .then(function() {
            return store;
        })
        .catch(function(err) {
            // TODO: proper error logging
            console.error(err);
            console.error(err.stack);
        });

};
