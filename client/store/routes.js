const co = require('co');
const page = require('page');

const {NOT_FOUND, OK} = require('./response');

const NOT_ID = {};

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


const loadAppState = co.wrap(function *(store) {

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

    store.resetStage();
    store.decks.root(rootDeckID);
    store.commit();

});

// based on: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt#A_stricter_parse_function
const filterID = function (value, defaultValue) {
    if(/^(\-|\+)?([0-9]+|Infinity)$/.test(value)) {
        value = Number(value);
        return (value > 0) ? value : defaultValue;
    }
    return defaultValue;
};

const ROUTE = {
    DECK: {
        VIEW: {
            CARDS: Symbol(),
            DECKS: Symbol()
        }
    }
};

const resolveRoute = function(routeID) {
};

const toDeck = function(deckID) {
    page.redirect(`/deck/${deckID}/view/cards`);
};


const boostrapRoutes = co.wrap(function *(store) {

    const toRootDeck = function() {
        const rootDeckID = store.decks.root();
        toDeck(rootDeckID);
    };

    const ensureValidDeckID = function(context, next) {

        const deckID = filterID(context.params.deck_id, NOT_ID);

        if(deckID === NOT_ID) {
            toRootDeck();
            return;
        }

        next();
    };

    const ensureDeckIDExists = co.wrap(function *(context, next) {

        const deckID = context.params.deck_id;

        // ensure not root deck
        if(deckID == store.decks.root()) {
            next();
            return;
        }

        const result = yield store.decks.exists(deckID);

        if(!result.response) {
            toRootDeck();
            return;
        }

        next();
    });

    const reloadAppState = co.wrap(function *(context, next) {

        if(store.loading()) {
            next();
            return;
        }

        store.loading(true);

        yield loadAppState(store);

        next();
    });

    const postRouteLoad = function() {
        store.loading(false);
    };

    page('/', reloadAppState, toRootDeck);

    page('/deck', reloadAppState, toRootDeck);

    page('/deck/:deck_id', reloadAppState, function(context) {
        const deckID = context.params.deck_id;
        toDeck(deckID);
    });

    page('/deck/:deck_id/view', reloadAppState, function(context) {
        const deckID = context.params.deck_id;
        toDeck(deckID);
    });

    page('/deck/:deck_id/view/cards', reloadAppState, ensureValidDeckID, ensureDeckIDExists, co.wrap(function *(context, next) {

        const deckID = context.params.deck_id;

        store.resetStage();
        store.decks.current(deckID);
        store.route(ROUTE.DECK.VIEW.CARDS);
        store.commit();

        next();

    }), postRouteLoad);

    page('/deck/:deck_id/view/decks', reloadAppState, ensureValidDeckID, ensureDeckIDExists, co.wrap(function *(context, next) {

        const deckID = context.params.deck_id;

        store.resetStage();
        store.decks.current(deckID);
        store.route(ROUTE.DECK.VIEW.DECKS);
        store.commit();

        next();

    }), postRouteLoad);

    // route not found; redirect to the root deck
    page('*', reloadAppState, toRootDeck);

    page.start({
        hashbang: true,
        click: false
    });
});

module.exports = {
    bootstrap: boostrapRoutes,
    types: ROUTE
};
