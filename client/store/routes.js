const co = require('co');
const page = require('page');

const NOT_ID = {};

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

const boostrapRoutes = co.wrap(function *(store) {

    const toDeck = function(deckID) {
        page.redirect(`/deck/${deckID}/view/cards`);
    };

    const toRootDeck = function() {
        const rootDeckID = store.rootDeck();
        toDeck(rootDeckID);
    };

    page('/', toRootDeck);

    page('/deck', toRootDeck);

    page('/deck/:deck_id', function(context) {

        const deckID = filterID(context.params.deck_id, NOT_ID);

        if(deckID === NOT_ID) {
            toRootDeck();
            return;
        }

        toDeck(deckID);
    });

    page('/deck/:deck_id/view', function(context) {

        const deckID = filterID(context.params.deck_id, NOT_ID);

        if(deckID === NOT_ID) {
            toRootDeck();
            return;
        }

        toDeck(deckID);
    });

    page('/deck/:deck_id/view/cards', co.wrap(function *(context) {

        const deckID = filterID(context.params.deck_id, NOT_ID);

        if(deckID === NOT_ID) {
            toRootDeck();
            return;
        }

        const result = yield store.decks.exists(deckID);

        if(!result.response) {
            toRootDeck();
            return;
        }

        store.resetStage();
        store.decks.current(deckID);
        store.route(ROUTE.DECK.VIEW.CARDS);
        store.commit();

    }));

    page('/deck/:deck_id/view/decks', co.wrap(function *(context) {

        const deckID = filterID(context.params.deck_id, NOT_ID);

        if(deckID === NOT_ID) {
            toRootDeck();
            return;
        }

        const result = yield store.decks.exists(deckID);

        if(!result.response) {
            toRootDeck();
            return;
        }

        store.resetStage();
        store.decks.current(deckID);
        store.route(ROUTE.DECK.VIEW.DECKS);
        store.commit();
    }));

    page('*', toRootDeck);

    page.start({
        hashbang: true,
        click: false
    });
});

module.exports = {
    bootstrap: boostrapRoutes,
    types: ROUTE
};
