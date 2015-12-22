const co = require('co');

const {NOT_FOUND, OK} = require('./response');
const {bootstrap: bootstrapRoutes} = require('./routes');

const createRootDeck = co.wrap(function* (store) {

    // create and set root deck

    let result = yield store.decks.create({
        name: 'library'
    });

    const deckID = result.response.id;

    result = yield store.configs.set('root_deck', deckID);

    // TODO: error handling of result

    return deckID;
});

const bootDecks = co.wrap(function *(store) {

    // fetch root deck

    const rootDeckID = yield co(function *() {

        // check if root deck exists

        let configResult = yield store.configs.get('root_deck');

        if(configResult.status === OK) {

            // ensure root deck exists; if not, create one

            const deckID = configResult.response.value;

            const result = yield store.decks.exists(deckID);

            if(!result.response) {
                return createRootDeck(store);
            }

            return deckID;

        } else if(configResult.status === NOT_FOUND) {
            return createRootDeck(store);
        }

        throw new Error(`unreachable: ${configResult}`);

    });

    // assign root deck into app state

    store.resetStage();
    store.decks.root(rootDeckID);
    store.commit();

});

module.exports = function(store) {

    return co(function* () {

        yield [
            bootDecks(store)
        ];

        yield bootstrapRoutes(store);

        return store;

    }).catch(function(err) {
        // TODO: proper error logging
        console.error(err);
        console.error(err.stack);
    });

};
