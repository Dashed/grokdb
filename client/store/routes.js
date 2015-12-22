const co = require('co');
const page = require('page');

const {NOT_FOUND, OK} = require('./response');

// sentinel values
const NOT_SET = {};
const NOT_ID = {};

// based on: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt#A_stricter_parse_function
const filterID = function (value, defaultValue) {
    if(/^(\-|\+)?([0-9]+|Infinity)$/.test(value)) {
        value = Number(value);
        return (value > 0) ? value : defaultValue;
    }
    return defaultValue;
};

const createRootDeck = co.wrap(function* (store) {

    // create and set root deck

    let result = yield store.decks.create({
        name: 'library'
    });

    const deckID = filterID(result.response.id);

    result = yield store.configs.set('root_deck', deckID);

    // TODO: error handling of result

    return deckID;
});

const loadAppState = co.wrap(function *(store) {

    // clear caches
    store.decks.clearCache();

    // fetch root deck

    const rootDeckID = yield co(function *() {

        const maybeRootDeckID = filterID(store.decks.root(), NOT_ID);

        if(maybeRootDeckID !== NOT_ID) {

            const result = yield store.decks.exists(maybeRootDeckID);

            if(result.response) {
                return maybeRootDeckID;
            }
        }

        // check if root deck exists

        let configResult = yield store.configs.get('root_deck');

        if(configResult.status === OK) {

            // ensure root deck exists; if not, create one

            const deckID = filterID(configResult.response.value, NOT_ID);

            if(deckID === NOT_ID) {
                return createRootDeck(store);
            }

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

const ROUTE = {
    LIBRARY: {
        VIEW: {
            CARDS: Symbol(),
            DECKS: Symbol()
        }
    },

    STASHES: Symbol(),

    SETTINGS: Symbol()
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

        context.deck_id = deckID;

        next();
    };

    const ensureDeckIDExists = co.wrap(function *(context, next) {

        const deckID = context.deck_id;

        // ensure not root deck
        if(deckID == store.decks.root()) {
            next();
            return;
        }

        const result = yield store.decks.exists(deckID);

        if(!result.response) {
            toRootDeck(context);
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

    page('/settings', reloadAppState, function(context, next) {

        store.resetStage();
        store.routes.route(ROUTE.SETTINGS);
        store.commit();

        next();

    }, postRouteLoad);

    page('/stashes', reloadAppState, function(context, next) {

        store.resetStage();
        store.routes.route(ROUTE.STASHES);
        store.commit();

        next();

    }, postRouteLoad);

    page('/deck', reloadAppState, toRootDeck);

    page('/deck/:deck_id', reloadAppState, function(context) {
        const deckID = context.params.deck_id;
        toDeck(deckID);
    });

    page('/deck/:deck_id/view', reloadAppState, function(context) {
        const deckID = context.params.deck_id;
        toDeck(deckID);
    });


    page('/deck/:deck_id/view/decks', reloadAppState, ensureValidDeckID, ensureDeckIDExists, function(context, next) {

        const deckID = context.deck_id;

        store.resetStage();
        store.decks.current(deckID);
        store.routes.route(ROUTE.LIBRARY.VIEW.DECKS);
        store.commit();

        next();

    }, postRouteLoad);

    page('/deck/:deck_id/view/cards', reloadAppState, ensureValidDeckID, ensureDeckIDExists, function(context, next) {

        const deckID = context.deck_id;

        store.resetStage();
        store.decks.current(deckID);
        store.routes.route(ROUTE.LIBRARY.VIEW.CARDS);
        store.commit();

        next();

    }, postRouteLoad);


    // route not found; redirect to the root deck
    page('*', function(context, next) {
        console.error('not found', context);
        next();
    }, reloadAppState, toRootDeck);

    page.base('/#');

    page.start({
        // hashbang: true,
        click: false
    });
});

function Routes(store) {

    this._store = store;
}

Routes.prototype.route = function(routeID = NOT_SET) {

    let stage = this._store.stage();

    let value = stage.getIn(['route']);

    if(routeID !== NOT_SET) {
        stage = stage.updateIn(['route'], function() {
            return routeID;
        });

        this._store.stage(stage);

        value = routeID;
    }

    return value;
};

Routes.prototype.watchRoute = function() {
    return this._store.state().cursor(['route']);
};

Routes.prototype.toLibrary = function() {

    this._store.resetStage();
    const deckID = this._store.decks.current();

    page(`/deck/${deckID}/view/cards`);
};

Routes.prototype.toSettings = function() {
    page(`/settings`);
};

Routes.prototype.toStashes = function() {
    page(`/stashes`);
};

module.exports = {
    bootstrap: boostrapRoutes,
    types: ROUTE,
    Routes: Routes
};
