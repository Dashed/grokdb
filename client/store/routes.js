const page = require('page');
const co = require('co');
const _ = require('lodash');
const invariant = require('invariant');

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

const createRootDeck = function(store) {


    let deckID;

    // create and set root deck
    return store.decks.create({
        name: 'library'
    })
    .then(function(result) {

        deckID = filterID(result.response.id);
        return store.configs.set('root_deck', deckID);
    })
    .then(function(/*result*/) {

        // TODO: error handling of result

        return store.decks.load(deckID);
    })
    .then(function() {
        return deckID;
    });
};

const loadAppState = co.wrap(function *(store) {

    // clear caches
    store.decks.clearCache();

    // fetch root deck

    const rootDeckID = yield co(function *() {

        const maybeRootDeckID = filterID(store.decks.root(), NOT_ID);

        if(maybeRootDeckID !== NOT_ID) {

            const result = yield store.decks.exists(maybeRootDeckID);

            if(result.response) {
                yield store.decks.load(maybeRootDeckID);
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

            yield store.decks.load(deckID);

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
            ADD_CARD: Symbol(),

            DECKS: Symbol(),
            ADD_DECK: Symbol(),

            DESCRIPTION: Symbol(),
            META: Symbol()
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

    const ensureDeckIDExists = function(context, next) {

        const deckID = context.deck_id;

        // ensure not root deck
        if(deckID == store.decks.root()) {
            next();
            return;
        }

        store.decks.exists(deckID)
        .then(function(result) {

            return new Promise(function(resolve, reject) {

                if(!result.response) {
                    toRootDeck(context);
                    return reject();
                }

                resolve(store.decks.get(deckID));
            });
        })
        .then(function() {
            next();
            return null;
        });

    };

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


    page('/deck/:deck_id/add/deck', reloadAppState, ensureValidDeckID, ensureDeckIDExists, function(context, next) {

        const deckID = context.deck_id;

        store.resetStage();
        store.decks.currentID(deckID);
        store.routes.route(ROUTE.LIBRARY.VIEW.ADD_DECK);
        store.commit();

        next();

    }, postRouteLoad);

    page('/deck/:deck_id/view/decks', reloadAppState, ensureValidDeckID, ensureDeckIDExists, function(context, next) {

        const deckID = context.deck_id;

        store.resetStage();
        store.decks.currentID(deckID);
        store.routes.route(ROUTE.LIBRARY.VIEW.DECKS);
        store.commit();

        next();

    }, postRouteLoad);

    page('/deck/:deck_id/view/cards', reloadAppState, ensureValidDeckID, ensureDeckIDExists, function(context, next) {

        const deckID = context.deck_id;

        store.resetStage();
        store.decks.currentID(deckID);
        store.routes.route(ROUTE.LIBRARY.VIEW.CARDS);
        store.commit();

        next();

    }, postRouteLoad);

    page('/deck/:deck_id/add/deck', reloadAppState, ensureValidDeckID, ensureDeckIDExists, function(context, next) {

        const deckID = context.deck_id;

        store.resetStage();
        store.decks.currentID(deckID);
        store.routes.route(ROUTE.LIBRARY.VIEW.ADD_CARD);
        store.commit();

        next();

    }, postRouteLoad);

    page('/deck/:deck_id/view/description', reloadAppState, ensureValidDeckID, ensureDeckIDExists, function(context, next) {

        const deckID = context.deck_id;

        store.resetStage();
        store.decks.currentID(deckID);
        store.routes.route(ROUTE.LIBRARY.VIEW.DESCRIPTION);
        store.commit();

        next();

    }, postRouteLoad);

    page('/deck/:deck_id/view/meta', reloadAppState, ensureValidDeckID, ensureDeckIDExists, function(context, next) {

        const deckID = context.deck_id;

        store.resetStage();
        store.decks.currentID(deckID);
        store.routes.route(ROUTE.LIBRARY.VIEW.META);
        store.commit();

        next();

    }, postRouteLoad);


    // route not found; redirect to the root deck
    page('*', function(context, next) {
        console.error('not found', context);
        next();
    }, reloadAppState, toRootDeck);

    page.exit(function(context, next) {

        // if a confirm callback is set, confirm to the user if they want to perform a
        // route change. (e.g. discard changes)
        store.routes.shouldChangeRoute(function() {
            next();
        });

    });

    // TODO: remove
    // page.base('/#');

    page.start({
        // hashbang: true,
        click: false
    });
});

function Routes(store) {

    this._store = store;
    this._confirm = void 0;
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

Routes.prototype.confirm = function(callback) {

    if(_.isFunction(callback)) {

        // if user reloads the page, confirm to the user
        window.onbeforeunload = callback;

        this._confirm = callback;
    }

    return this._confirm;
};

Routes.prototype.removeConfirm = function() {

    window.onbeforeunload = void 0;

    this._confirm = void 0;
};

// call this function to check if all pre-conditions are satisfied before a route
// can be changed. if pre-conditions are satisfied, then callback is called.
// otherwise, callback is not called.
Routes.prototype.shouldChangeRoute = function(callback) {

    const confirm = this.confirm();

    if(_.isFunction(confirm)) {
        const message = confirm.call(null);

        if(_.isString(message)) {
            const ret = window.confirm(message);

            if(!ret) {
                return;
            }
        }
    }

    this.removeConfirm();

    callback.call(null);

};

Routes.prototype.toDeck = function(deckID) {

    invariant(_.isNumber(filterID(deckID)) && deckID > 0, `Malformed deckID. Given ${deckID}`);

    this.shouldChangeRoute(() => {
        page(`/deck/${deckID}/view/cards`);
    });
};

Routes.prototype.toLibraryCards = Routes.prototype.toLibrary = function(toDeckID = NOT_SET) {

    this.shouldChangeRoute(() => {

        if(toDeckID === NOT_SET) {
            this._store.resetStage();
            toDeckID = this._store.decks.currentID();
        }

        page(`/deck/${toDeckID}/view/cards`);
    });

};

Routes.prototype.toLibraryDecks = function(toDeckID = NOT_SET) {

    this.shouldChangeRoute(() => {

        if(toDeckID === NOT_SET) {
            this._store.resetStage();
            toDeckID = this._store.decks.currentID();
        }

        page(`/deck/${toDeckID}/view/decks`);
    });

};

Routes.prototype.toAddNewDeck = function(toDeckID = NOT_SET) {

    this.shouldChangeRoute(() => {

        if(toDeckID === NOT_SET) {
            this._store.resetStage();
            toDeckID = this._store.decks.currentID();
        }

        page(`/deck/${toDeckID}/add/deck`);
    });

};

Routes.prototype.toLibraryDescription = function(toDeckID = NOT_SET) {

    this.shouldChangeRoute(() => {

        if(toDeckID === NOT_SET) {
            this._store.resetStage();
            toDeckID = this._store.decks.currentID();
        }

        page(`/deck/${toDeckID}/view/description`);
    });

};

Routes.prototype.toLibraryMeta = function(toDeckID = NOT_SET) {

    this.shouldChangeRoute(() => {

        if(toDeckID === NOT_SET) {
            this._store.resetStage();
            toDeckID = this._store.decks.currentID();
        }

        page(`/deck/${toDeckID}/view/meta`);
    });

};

Routes.prototype.toSettings = function() {

    this.shouldChangeRoute(() => {
        page(`/settings`);
    });
};

Routes.prototype.toStashes = function() {

    this.shouldChangeRoute(() => {
        page(`/stashes`);
    });
};

module.exports = {
    bootstrap: boostrapRoutes,
    types: ROUTE,
    Routes: Routes
};
