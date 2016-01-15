const page = require('page');
const co = require('co');
const _ = require('lodash');
const invariant = require('invariant');
const qs = require('qs');

const filterInteger = require('utils/filterinteger');
const {NOT_FOUND, OK} = require('./response');

const {pagination: cardPagination} = require('./cards');
const {pagination: stashPagination} = require('./stashes');
const {perPage} = require('constants/cardspagination');

// sentinel values
const NOT_SET = {};
const NOT_ID = {};

const createRootDeck = function(store) {

    let deckID;

    // create and set root deck
    return store.decks.create({
        name: 'Library'
    })
    .then(function(result) {

        deckID = filterInteger(result.response.id);
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

const loadAppState = function(store) {

    // clear caches
    store.decks.clearCache();
    store.cards.clearCache();
    store.review.clearCache();
    store.stashes.clearCache();

    const prom = co(function *() {

        let maybeRootDeckID = filterInteger(store.decks.root(), NOT_ID);

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

            const deckID = filterInteger(configResult.response.value, NOT_ID);

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

    return Promise.resolve(prom).then(function(rootDeckID) {

        store.resetStage();
        store.decks.root(rootDeckID);
        store.commit();
    });

};

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

    // TODO: move this into ROUTE.LIBRARY
    CARD: {

        VIEW: {
            FRONT: Symbol(),
            BACK: Symbol(),
            DESCRIPTION: Symbol(),
            STASHES: Symbol(),
            META: Symbol()
        },

        REVIEW: {
            VIEW: {
                FRONT: Symbol(),
                BACK: Symbol(),
                DESCRIPTION: Symbol(),
                STASHES: Symbol(),
                META: Symbol()
            }
        }
    },

    // TODO: move this into ROUTE.LIBRARY
    // deck review
    REVIEW: {
        VIEW: {
            FRONT: Symbol('review/view/front'),
            BACK: Symbol('review/view/back'),
            DESCRIPTION: Symbol(),
            STASHES: Symbol(),
            META: Symbol()
        }
    },

    STASHES: {

        VIEW: {
            LIST: Symbol(),
            ADD: Symbol()
        },

        // viewing a stash profile
        PROFILE: {
            CARDS: Symbol(),
            DESCRIPTION: Symbol(),
            META: Symbol()
        },

        REVIEW: {
            VIEW: {
                FRONT: Symbol(),
                BACK: Symbol(),
                DESCRIPTION: Symbol(),
                META: Symbol()
                // note: Stashes is not supported
            }
        },

        CARD: {

            VIEW: {
                FRONT: Symbol(),
                BACK: Symbol(),
                DESCRIPTION: Symbol(),
                STASHES: Symbol(),
                META: Symbol()
            }
        }
    },

    SETTINGS: Symbol()
};

const toDeck = function(deckID) {
    page.redirect(`/deck/${deckID}/view/cards`);
};

const toCardOfDeck = function(cardID, deckID) {
    page.redirect(`/deck/${deckID}/card/${cardID}/view/front`);
};

const boostrapRoutes = function(store) {


    const toRootDeck = function() {
        const rootDeckID = store.decks.root();
        toDeck(rootDeckID);
    };

    const ensureValidDeckID = function(context, next) {

        const deckID = filterInteger(context.params.deck_id, NOT_ID);

        if(deckID === NOT_ID) {
            toRootDeck();
            return;
        }

        context.deck_id = deckID;

        next();
    };

    const ensureDeckIDExists = function(context, next) {

        const deckID = context.deck_id;

        // ensure not root deck, since root should already be loaded.
        if(deckID == store.decks.root()) {
            next();
            return;
        }

        store.decks.exists(deckID)
        .then(function(result) {

            return new Promise(function(__resolve, reject) {

                if(!result.response) {
                    toRootDeck(context);
                    return reject(Error('redirecting'));
                }

                __resolve(store.decks.get(deckID));
            });
        })
        .then(function() {
            next();
            return null;
        }, function() {
            return null;
        });

    };

    const redirectToDeckByID = function(context) {
        toDeck(context.deck_id);
    };

    const ensureValidCardID = function(otherwise) {

        return function(context, next) {

            const cardID = filterInteger(context.params.card_id, NOT_ID);

            if(cardID === NOT_ID) {
                otherwise.call(void 0, context);
                return;
            }

            context.card_id = cardID;

            next();
        };
    };

    const ensureCardIDByDeckIDExists = function(context, next) {

        const cardID = context.card_id;
        const deckID = context.deck_id;

        store.cards.loadByDeck(cardID, deckID)
            .then(
            // fulfillment
            function() {

                next();
                return null;
            },
            // rejection
            function() {

                // card doesn't exist within given deck

                toDeck(deckID);
                return null;
            });

    };

    const parseQueries = function(context, next) {

        context.queries = qs.parse(context.querystring);

        return next();
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

    page('/deck', reloadAppState, toRootDeck);

    page('/deck/:deck_id', reloadAppState, function(context) {
        const deckID = context.params.deck_id;
        toDeck(deckID);
    });

    page('/deck/:deck_id/view', reloadAppState, function(context) {
        const deckID = context.params.deck_id;
        toDeck(deckID);
    });

    page('/deck/:deck_id/new/deck', reloadAppState, ensureValidDeckID, ensureDeckIDExists, function(context, next) {

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

    page('/deck/:deck_id/view/cards',
        reloadAppState,
        ensureValidDeckID,
        ensureDeckIDExists,
        parseQueries,
        function(context, next) {

            const {queries} = context;

            const deckID = context.deck_id;

            store.resetStage();
            store.decks.currentID(deckID);
            store.routes.route(ROUTE.LIBRARY.VIEW.CARDS);

            // pagination queries

            let pageNum = 1;
            if(_.has(queries, 'page')) {

                pageNum = filterInteger(queries.page, NOT_SET);

                if(pageNum === NOT_SET) {
                    pageNum = 1;
                }
            }
            store.cards.page(pageNum);

            if(_.has(queries, 'order_by')) {

                let pageOrder = NOT_SET;

                switch(String(queries.order_by).toLowerCase()) {

                case 'descending':
                case 'desc':
                    pageOrder = cardPagination.order.DESC;
                    break;

                case 'ascending':
                case 'asc':
                    pageOrder = cardPagination.order.ASC;
                    break;

                default:
                    pageOrder = cardPagination.order.DESC;
                }

                store.cards.order(pageOrder);
            }

            if(_.has(queries, 'sort_by')) {

                let pageSort = NOT_SET;

                switch(String(queries.sort_by).toLowerCase()) {

                case 'reviewed_at':
                    pageSort = cardPagination.sort.REVIEWED_AT;
                    break;

                case 'times_reviewed':
                    pageSort = cardPagination.sort.TIMES_REVIEWED;
                    break;

                case 'title':
                    pageSort = cardPagination.sort.TITLE;
                    break;

                case 'created_at':
                    pageSort = cardPagination.sort.CREATED_AT;
                    break;

                case 'updated_at':
                    pageSort = cardPagination.sort.UPDATED_AT;
                    break;

                default:
                    pageSort = cardPagination.sort.UPDATED_AT;
                }

                store.cards.sort(pageSort);
            }

            // ensure pageNum is within valid bounds

            store.cards.totalCards(deckID)
                .then(
                // fulfillment
                function(totalCards) {

                    if(totalCards <= 0) {
                        store.commit();
                        next();
                        return null;
                    }

                    const numOfPages = Math.ceil(totalCards / perPage);
                    const pageSort = store.cards.sort();
                    const pageOrder = store.cards.order();

                    if(pageNum > numOfPages || pageNum <= 0) {
                        store.routes.toLibraryCards(deckID, pageSort, pageOrder, 1);
                        return null;
                    }

                    store.commit();

                    next();
                    return null;
                });

        }, postRouteLoad);

    page('/deck/:deck_id/new/deck', reloadAppState, ensureValidDeckID, ensureDeckIDExists, function(context, next) {

        const deckID = context.deck_id;

        store.resetStage();
        store.decks.currentID(deckID);
        store.routes.route(ROUTE.LIBRARY.VIEW.ADD_DECK);
        store.commit();

        next();

    }, postRouteLoad);

    page('/deck/:deck_id/new/card', reloadAppState, ensureValidDeckID, ensureDeckIDExists, function(context, next) {

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

    page('/deck/:deck_id/review', reloadAppState, ensureValidDeckID, ensureDeckIDExists, function(context) {

        const deckID = context.deck_id;

        page.redirect(`/deck/${deckID}/review/view/front`);

    });

    page('/deck/:deck_id/review/view/front', reloadAppState, ensureValidDeckID, ensureDeckIDExists, function(context, next) {

        const deckID = context.deck_id;

        store.resetStage();
        store.decks.currentID(deckID);
        store.routes.route(ROUTE.REVIEW.VIEW.FRONT);
        store.commit();

        next();

    }, postRouteLoad);

    page('/deck/:deck_id/review/view/back', reloadAppState, ensureValidDeckID, ensureDeckIDExists, function(context, next) {

        // check if back side of card can be shown

        const deckID = context.deck_id;

        store.resetStage();
        store.decks.currentID(deckID);
        store.routes.route(ROUTE.REVIEW.VIEW.BACK);
        store.commit();

        next();

    }, postRouteLoad);

    page('/deck/:deck_id/review/view/description', reloadAppState, ensureValidDeckID, ensureDeckIDExists, function(context, next) {

        const deckID = context.deck_id;

        store.resetStage();
        store.decks.currentID(deckID);
        store.routes.route(ROUTE.REVIEW.VIEW.DESCRIPTION);
        store.commit();

        next();

    }, postRouteLoad);

    page('/deck/:deck_id/review/view/stashes', reloadAppState, ensureValidDeckID, ensureDeckIDExists, function(context, next) {

        const deckID = context.deck_id;

        store.resetStage();
        store.decks.currentID(deckID);
        store.routes.route(ROUTE.REVIEW.VIEW.STASHES);
        store.commit();

        next();

    }, postRouteLoad);

    page('/deck/:deck_id/review/view/meta', reloadAppState, ensureValidDeckID, ensureDeckIDExists, function(context, next) {

        const deckID = context.deck_id;

        store.resetStage();
        store.decks.currentID(deckID);
        store.routes.route(ROUTE.REVIEW.VIEW.META);
        store.commit();

        next();

    }, postRouteLoad);

    page('/card', reloadAppState, toRootDeck);

    page('/card/:card_id', reloadAppState, ensureValidCardID(redirectToDeckByID), function(context) {
        const cardID = context.params.card_id;

        store.cards.get(cardID)
            .then(function(card) {

                // card not found
                if(!card) {
                    toRootDeck();
                    return null;
                }


                toCardOfDeck(card.get('id'), card.get('deck'));
                return null;
            });

    });

    page('/card/:card_id/view', reloadAppState, ensureValidCardID(redirectToDeckByID), function(context) {
        const cardID = context.params.card_id;

        store.cards.get(cardID)
            .then(function(card) {

                // card not found
                if(!card) {
                    toRootDeck();
                    return null;
                }


                toCardOfDeck(card.get('id'), card.get('deck'));
                return null;
            });
    });

    page('/card/:card_id/view/front',
            reloadAppState,
            ensureValidCardID(redirectToDeckByID),
            function(context) {

                const cardID = context.params.card_id;

                store.cards.get(cardID)
                    .then(function(card) {

                        if(!card) {
                            toRootDeck();
                            return null;
                        }

                        page.redirect(`/deck/${card.get('deck')}/card/${card.get('id')}/view/front`);
                        return null;
                    });
            });

    page('/card/:card_id/view/back',
            reloadAppState,
            ensureValidCardID(redirectToDeckByID),
            function(context) {

                const cardID = context.params.card_id;

                store.cards.get(cardID)
                    .then(function(card) {

                        if(!card) {
                            toRootDeck();
                            return null;
                        }

                        page.redirect(`/deck/${card.get('deck')}/card/${card.get('id')}/view/back`);
                        return null;
                    });
            });

    page('/card/:card_id/view/description',
            reloadAppState,
            ensureValidCardID(redirectToDeckByID),
            function(context) {

                const cardID = context.params.card_id;

                store.cards.get(cardID)
                    .then(function(card) {

                        if(!card) {
                            toRootDeck();
                            return null;
                        }

                        page.redirect(`/deck/${card.get('deck')}/card/${card.get('id')}/view/description`);
                        return null;
                    });
            });

    page('/card/:card_id/view/meta',
            reloadAppState,
            ensureValidCardID(redirectToDeckByID),
            function(context) {

                const cardID = context.params.card_id;

                store.cards.get(cardID)
                    .then(function(card) {

                        if(!card) {
                            toRootDeck();
                            return null;
                        }

                        page.redirect(`/deck/${card.get('deck')}/card/${card.get('id')}/view/meta`);
                        return null;
                    });
            });

    page('/card/:card_id/view/stashes',
            reloadAppState,
            ensureValidCardID(redirectToDeckByID),
            function(context) {

                const cardID = context.params.card_id;

                store.cards.get(cardID)
                    .then(function(card) {

                        if(!card) {
                            toRootDeck();
                            return null;
                        }

                        page.redirect(`/deck/${card.get('deck')}/card/${card.get('id')}/view/stashes`);
                        return null;
                    });
            });

    page('/deck/:deck_id/card/:card_id',
            reloadAppState,
            function(context) {

                const deckID = context.params.deck_id;
                const cardID = context.params.card_id;
                page.redirect(`/deck/${deckID}/card/${cardID}/view/front`);

            });

    page('/deck/:deck_id/card/:card_id/view',
            reloadAppState,
            function(context) {

                const deckID = context.params.deck_id;
                const cardID = context.params.card_id;
                page.redirect(`/deck/${deckID}/card/${cardID}/view/front`);

            });

    page('/deck/:deck_id/card/:card_id/view/front',
            reloadAppState,
            ensureValidDeckID,
            ensureValidCardID(redirectToDeckByID),
            ensureDeckIDExists,
            ensureCardIDByDeckIDExists,
            function(context, next) {

                const deckID = context.deck_id;
                const cardID = context.card_id;

                store.resetStage();
                store.decks.currentID(deckID);
                store.cards.currentID(cardID);
                store.routes.route(ROUTE.CARD.VIEW.FRONT);
                store.commit();

                next();
            }, postRouteLoad);

    page('/deck/:deck_id/card/:card_id/view/back',
            reloadAppState,
            ensureValidDeckID,
            ensureValidCardID(redirectToDeckByID),
            ensureDeckIDExists,
            ensureCardIDByDeckIDExists,
            function(context, next) {

                const deckID = context.deck_id;
                const cardID = context.card_id;

                store.resetStage();
                store.decks.currentID(deckID);
                store.cards.currentID(cardID);
                store.routes.route(ROUTE.CARD.VIEW.BACK);
                store.commit();

                next();
            }, postRouteLoad);

    page('/deck/:deck_id/card/:card_id/view/description',
            reloadAppState,
            ensureValidDeckID,
            ensureValidCardID(redirectToDeckByID),
            ensureDeckIDExists,
            ensureCardIDByDeckIDExists,
            function(context, next) {

                const deckID = context.deck_id;
                const cardID = context.card_id;

                store.resetStage();
                store.decks.currentID(deckID);
                store.cards.currentID(cardID);
                store.routes.route(ROUTE.CARD.VIEW.DESCRIPTION);
                store.commit();

                next();
            }, postRouteLoad);

    page('/deck/:deck_id/card/:card_id/view/meta',
            reloadAppState,
            ensureValidDeckID,
            ensureValidCardID(redirectToDeckByID),
            ensureDeckIDExists,
            ensureCardIDByDeckIDExists,
            function(context, next) {

                const deckID = context.deck_id;
                const cardID = context.card_id;

                store.resetStage();
                store.decks.currentID(deckID);
                store.cards.currentID(cardID);
                store.routes.route(ROUTE.CARD.VIEW.META);
                store.commit();

                next();
            }, postRouteLoad);

    page('/deck/:deck_id/card/:card_id/view/stashes',
            reloadAppState,
            ensureValidDeckID,
            ensureValidCardID(redirectToDeckByID),
            ensureDeckIDExists,
            ensureCardIDByDeckIDExists,
            function(context, next) {

                const deckID = context.deck_id;
                const cardID = context.card_id;

                store.resetStage();
                store.decks.currentID(deckID);
                store.cards.currentID(cardID);
                store.routes.route(ROUTE.CARD.VIEW.STASHES);
                store.commit();

                next();
            }, postRouteLoad);

    page('/deck/:deck_id/card/:card_id/review',
            reloadAppState,
            function(context) {

                const deckID = context.params.deck_id;
                const cardID = context.params.card_id;

                page.redirect(`/deck/${deckID}/card/${cardID}/review/front`);

            });

    page('/deck/:deck_id/card/:card_id/review/front',
            reloadAppState,
            ensureValidDeckID,
            ensureValidCardID(redirectToDeckByID),
            ensureDeckIDExists,
            ensureCardIDByDeckIDExists,
            function(context, next) {

                const deckID = context.deck_id;
                const cardID = context.card_id;

                store.resetStage();
                store.decks.currentID(deckID);
                store.cards.currentID(cardID);
                store.routes.route(ROUTE.CARD.REVIEW.VIEW.FRONT);
                store.commit();

                next();
            }, postRouteLoad);

    page('/deck/:deck_id/card/:card_id/review/back',
            reloadAppState,
            ensureValidDeckID,
            ensureValidCardID(redirectToDeckByID),
            ensureDeckIDExists,
            ensureCardIDByDeckIDExists,
            function(context, next) {

                const deckID = context.deck_id;
                const cardID = context.card_id;

                store.resetStage();
                store.decks.currentID(deckID);
                store.cards.currentID(cardID);
                store.routes.route(ROUTE.CARD.REVIEW.VIEW.BACK);
                store.commit();

                next();
            }, postRouteLoad);

    page('/deck/:deck_id/card/:card_id/review/description',
            reloadAppState,
            ensureValidDeckID,
            ensureValidCardID(redirectToDeckByID),
            ensureDeckIDExists,
            ensureCardIDByDeckIDExists,
            function(context, next) {

                const deckID = context.deck_id;
                const cardID = context.card_id;

                store.resetStage();
                store.decks.currentID(deckID);
                store.cards.currentID(cardID);
                store.routes.route(ROUTE.CARD.REVIEW.VIEW.DESCRIPTION);
                store.commit();

                next();
            }, postRouteLoad);

    page('/deck/:deck_id/card/:card_id/review/stashes',
            reloadAppState,
            ensureValidDeckID,
            ensureValidCardID(redirectToDeckByID),
            ensureDeckIDExists,
            ensureCardIDByDeckIDExists,
            function(context, next) {

                const deckID = context.deck_id;
                const cardID = context.card_id;

                store.resetStage();
                store.decks.currentID(deckID);
                store.cards.currentID(cardID);
                store.routes.route(ROUTE.CARD.REVIEW.VIEW.STASHES);
                store.commit();

                next();
            }, postRouteLoad);

    page('/deck/:deck_id/card/:card_id/review/meta',
            reloadAppState,
            ensureValidDeckID,
            ensureValidCardID(redirectToDeckByID),
            ensureDeckIDExists,
            ensureCardIDByDeckIDExists,
            function(context, next) {

                const deckID = context.deck_id;
                const cardID = context.card_id;

                store.resetStage();
                store.decks.currentID(deckID);
                store.cards.currentID(cardID);
                store.routes.route(ROUTE.CARD.REVIEW.VIEW.META);
                store.commit();

                next();
            }, postRouteLoad);

    page('/stashes', reloadAppState, parseQueries, function(context, next) {

        const {queries} = context;

        store.resetStage();
        store.routes.route(ROUTE.STASHES.VIEW.LIST);

        // pagination queries
        let pageNum = 1;
        if(_.has(queries, 'page')) {

            pageNum = filterInteger(queries.page, NOT_SET);

            if(pageNum === NOT_SET) {
                pageNum = 1;
            }
        }
        store.stashes.page(pageNum);

        if(_.has(queries, 'order_by')) {

            let pageOrder = NOT_SET;

            switch(String(queries.order_by).toLowerCase()) {

            case 'descending':
            case 'desc':
                pageOrder = stashPagination.order.DESC;
                break;

            case 'ascending':
            case 'asc':
                pageOrder = stashPagination.order.ASC;
                break;

            default:
                pageOrder = stashPagination.order.DESC;
            }

            store.stashes.order(pageOrder);
        }

        if(_.has(queries, 'sort_by')) {

            let pageSort = NOT_SET;

            switch(String(queries.sort_by).toLowerCase()) {

            case 'name':
                pageSort = stashPagination.sort.NAME;
                break;

            case 'created_at':
                pageSort = stashPagination.sort.CREATED_AT;
                break;

            case 'updated_at':
                pageSort = stashPagination.sort.UPDATED_AT;
                break;

            default:
                pageSort = stashPagination.sort.UPDATED_AT;
            }

            store.stashes.sort(pageSort);
        }

        // ensure pageNum is within valid bounds

        store.stashes.totalStashes()
            .then(
            // fulfillment
            function(totalStashes) {

                if(totalStashes <= 0) {
                    store.commit();
                    next();
                    return null;
                }

                const numOfPages = Math.ceil(totalStashes / perPage);
                const pageSort = store.stashes.sort();
                const pageOrder = store.stashes.order();

                if(pageNum > numOfPages || pageNum <= 0) {
                    store.routes.toStashes(pageSort, pageOrder, 1);
                    return null;
                }

                store.commit();

                next();
                return null;
            });

    }, postRouteLoad);

    page('/stashes/new', reloadAppState, function(context, next) {

        store.resetStage();
        store.routes.route(ROUTE.STASHES.VIEW.ADD);
        store.commit();

        next();

    }, postRouteLoad);

    const toStash = function(stashID) {
        page.redirect(`/stash/${stashID}/cards`);
    };

    const redirectToStashByID = function(context) {
        toStash(context.stash_id);
    };


    const toStashCard = function(stashID, cardID) {
        page.redirect(`/stash/${stashID}/card/${cardID}/view/front`);
    };

    const toStashList = function() {
        page.redirect(`/stashes`);
    };

    const ensureValidStashID = function(context, next) {

        const stashID = filterInteger(context.params.stash_id, NOT_ID);

        if(stashID === NOT_ID) {
            toStashList();
            return;
        }

        context.stash_id = stashID;

        next();
    };

    const ensureStashIDExists = function(context, next) {

        const stashID = context.stash_id;

        store.stashes.exists(stashID)
        .then(function(result) {

            return new Promise(function(__resolve, reject) {

                if(!result.response) {
                    toStashList();
                    return reject(Error('redirecting'));
                }

                __resolve(store.stashes.get(stashID));
            });
        })
        .then(function() {
            next();
            return null;
        }, function() {
            return null;
        });

    };

    const ensureCardIDByStashIDExists = function(context, next) {

        const cardID = context.card_id;
        const stashID = context.stash_id;

        store.cards.loadByStash(cardID, stashID)
            .then(
            // fulfillment
            function() {

                next();
                return null;
            },
            // rejection
            function() {

                // card doesn't exist within given deck

                toStash(stashID);
                return null;
            });

    };

    page('/stash/:stash_id',
        reloadAppState,
        function(context) {

            const stashID = context.params.stash_id;
            toStash(stashID);

        });

    page('/stash/:stash_id/cards',
        reloadAppState,
        ensureValidStashID,
        ensureStashIDExists,
        parseQueries,
        function(context, next) {

            const {queries} = context;

            const stashID = context.stash_id;

            store.resetStage();
            store.stashes.currentID(stashID);
            store.routes.route(ROUTE.STASHES.PROFILE.CARDS);

            // pagination queries

            let pageNum = 1;
            if(_.has(queries, 'page')) {

                pageNum = filterInteger(queries.page, NOT_SET);

                if(pageNum === NOT_SET) {
                    pageNum = 1;
                }
            }
            store.cards.pageOfStash(pageNum);

            if(_.has(queries, 'order_by')) {

                let pageOrder = NOT_SET;

                switch(String(queries.order_by).toLowerCase()) {

                case 'descending':
                case 'desc':
                    pageOrder = cardPagination.order.DESC;
                    break;

                case 'ascending':
                case 'asc':
                    pageOrder = cardPagination.order.ASC;
                    break;

                default:
                    pageOrder = cardPagination.order.DESC;
                }

                store.cards.orderOfStash(pageOrder);
            }

            if(_.has(queries, 'sort_by')) {

                let pageSort = NOT_SET;

                switch(String(queries.sort_by).toLowerCase()) {

                case 'reviewed_at':
                    pageSort = cardPagination.sort.REVIEWED_AT;
                    break;

                case 'times_reviewed':
                    pageSort = cardPagination.sort.TIMES_REVIEWED;
                    break;

                case 'title':
                    pageSort = cardPagination.sort.TITLE;
                    break;

                case 'created_at':
                    pageSort = cardPagination.sort.CREATED_AT;
                    break;

                case 'updated_at':
                    pageSort = cardPagination.sort.UPDATED_AT;
                    break;

                default:
                    pageSort = cardPagination.sort.UPDATED_AT;
                }

                store.cards.sortOfStash(pageSort);
            }

            // ensure pageNum is within valid bounds

            store.cards.totalCardsByStash(stashID)
                .then(
                // fulfillment
                function(totalCards) {

                    if(totalCards <= 0) {
                        store.commit();
                        next();
                        return null;
                    }

                    const numOfPages = Math.ceil(totalCards / perPage);
                    const pageSort = store.cards.sort();
                    const pageOrder = store.cards.order();

                    if(pageNum > numOfPages || pageNum <= 0) {
                        store.routes.toStashCards(stashID, pageSort, pageOrder, 1);
                        return null;
                    }

                    store.commit();

                    next();
                    return null;
                });


        }, postRouteLoad);

    page('/stash/:stash_id/description',
        reloadAppState,
        ensureValidStashID,
        ensureStashIDExists,
        function(context, next) {

            const stashID = context.stash_id;

            store.resetStage();
            store.stashes.currentID(stashID);
            store.routes.route(ROUTE.STASHES.PROFILE.DESCRIPTION);
            store.commit();

            next();

        }, postRouteLoad);

    page('/stash/:stash_id/meta',
        reloadAppState,
        ensureValidStashID,
        ensureStashIDExists,
        function(context, next) {

            const stashID = context.stash_id;

            store.resetStage();
            store.stashes.currentID(stashID);
            store.routes.route(ROUTE.STASHES.PROFILE.META);
            store.commit();

            next();

        }, postRouteLoad);

    page('/stash/:stash_id/card',
        reloadAppState, function(context) {

            const stashID = context.params.stash_id;
            toStash(stashID);

        });

    page('/stash/:stash_id/card/:card_id',
        reloadAppState, function(context) {

            const stashID = context.params.stash_id;
            const cardID = context.params.card_id;
            toStashCard(stashID, cardID);

        });

    page('/stash/:stash_id/card/:card_id/view',
        reloadAppState, function(context) {

            const stashID = context.params.stash_id;
            const cardID = context.params.card_id;
            toStashCard(stashID, cardID);

        });

    page('/stash/:stash_id/card/:card_id/view/front',
        reloadAppState,
        ensureValidStashID,
        ensureValidCardID(redirectToStashByID),
        ensureStashIDExists,
        ensureCardIDByStashIDExists,
            function(context, next) {

                const stashID = context.stash_id;
                const cardID = context.card_id;

                store.resetStage();
                store.stashes.currentID(stashID);
                store.cards.currentID(cardID);
                store.routes.route(ROUTE.STASHES.CARD.VIEW.FRONT);
                store.commit();

                next();
            }, postRouteLoad);

    page('/stash/:stash_id/card/:card_id/view/back',
        reloadAppState,
        ensureValidStashID,
        ensureValidCardID(redirectToStashByID),
        ensureStashIDExists,
        ensureCardIDByStashIDExists,
            function(context, next) {

                const stashID = context.stash_id;
                const cardID = context.card_id;

                store.resetStage();
                store.stashes.currentID(stashID);
                store.cards.currentID(cardID);
                store.routes.route(ROUTE.STASHES.CARD.VIEW.BACK);
                store.commit();

                next();
            }, postRouteLoad);

    page('/stash/:stash_id/card/:card_id/view/description',
        reloadAppState,
        ensureValidStashID,
        ensureValidCardID(redirectToStashByID),
        ensureStashIDExists,
        ensureCardIDByStashIDExists,
            function(context, next) {

                const stashID = context.stash_id;
                const cardID = context.card_id;

                store.resetStage();
                store.stashes.currentID(stashID);
                store.cards.currentID(cardID);
                store.routes.route(ROUTE.STASHES.CARD.VIEW.DESCRIPTION);
                store.commit();

                next();
            }, postRouteLoad);

    page('/stash/:stash_id/card/:card_id/view/stashes',
        reloadAppState,
        ensureValidStashID,
        ensureValidCardID(redirectToStashByID),
        ensureStashIDExists,
        ensureCardIDByStashIDExists,
            function(context, next) {

                const stashID = context.stash_id;
                const cardID = context.card_id;

                store.resetStage();
                store.stashes.currentID(stashID);
                store.cards.currentID(cardID);
                store.routes.route(ROUTE.STASHES.CARD.VIEW.STASHES);
                store.commit();

                next();
            }, postRouteLoad);

    page('/stash/:stash_id/card/:card_id/view/meta',
        reloadAppState,
        ensureValidStashID,
        ensureValidCardID(redirectToStashByID),
        ensureStashIDExists,
        ensureCardIDByStashIDExists,
            function(context, next) {

                const stashID = context.stash_id;
                const cardID = context.card_id;

                store.resetStage();
                store.stashes.currentID(stashID);
                store.cards.currentID(cardID);
                store.routes.route(ROUTE.STASHES.CARD.VIEW.META);
                store.commit();

                next();
            }, postRouteLoad);

    page('/stash/:stash_id/review', reloadAppState, ensureValidStashID, ensureStashIDExists, function(context) {

        const stashID = context.stash_id;

        page.redirect(`/stash/${stashID}/review/view/front`);

    });

    page('/stash/:stash_id/review/view/front', reloadAppState, ensureValidStashID, ensureStashIDExists, function(context, next) {

        const stashID = context.stash_id;

        store.resetStage();
        store.stashes.currentID(stashID);
        store.routes.route(ROUTE.STASHES.REVIEW.VIEW.FRONT);
        store.commit();

        next();

    }, postRouteLoad);

    page('/stash/:stash_id/review/view/back', reloadAppState, ensureValidStashID, ensureStashIDExists, function(context, next) {

        const stashID = context.stash_id;

        store.resetStage();
        store.stashes.currentID(stashID);
        store.routes.route(ROUTE.STASHES.REVIEW.VIEW.BACK);
        store.commit();

        next();

    }, postRouteLoad);

    page('/stash/:stash_id/review/view/description', reloadAppState, ensureValidStashID, ensureStashIDExists, function(context, next) {

        const stashID = context.stash_id;

        store.resetStage();
        store.stashes.currentID(stashID);
        store.routes.route(ROUTE.STASHES.REVIEW.VIEW.DESCRIPTION);
        store.commit();

        next();

    }, postRouteLoad);

    page('/stash/:stash_id/review/view/meta', reloadAppState, ensureValidStashID, ensureStashIDExists, function(context, next) {

        const stashID = context.stash_id;

        store.resetStage();
        store.stashes.currentID(stashID);
        store.routes.route(ROUTE.STASHES.REVIEW.VIEW.META);
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
        store.routes.shouldChangeRoute(context, function() {
            next();
        }, function() {

            // TODO: this is partial fix. history seems to be still flaky

            store.routes.removeConfirm();

            page.redirect(context.canonicalPath);
        });

    });

    // TODO: remove
    // page.base('/#');

    page.start({
        // hashbang: true,
        click: false
    });

    return Promise.resolve(1);
};

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

    return {
        observe: (observer) => {

            const cursor = this._store.state().cursor(['route']);

            return cursor.observe(function(newRoute, oldRoute) {
                if(!newRoute) {
                    return;
                }

                observer.call(null, newRoute, oldRoute);
            });
        }
    };

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
Routes.prototype.shouldChangeRoute = function(ctx, callback, otherwise) {

    const confirm = this.confirm();

    const context = !_.isFunction(ctx) ? ctx : void 0;

    callback = _.isFunction(callback) ? callback :
        _.isFunction(ctx) ? ctx : () => void 0;

    if(_.isFunction(confirm)) {
        const message = confirm.call(null, context);

        if(_.isString(message)) {
            const ret = window.confirm(message);

            if(!ret) {

                if(_.isFunction(otherwise)) {
                    otherwise.call(null);
                }

                return;
            }
        }
    }

    this.removeConfirm();

    callback.call(null);

};

Routes.prototype.toDeck = function(deckID, pageNum = NOT_SET) {

    invariant(_.isNumber(filterInteger(deckID)) && deckID > 0, `Malformed deckID. Given ${deckID}`);

    if(pageNum !== NOT_SET) {
        invariant(_.isNumber(filterInteger(pageNum)) && pageNum > 0, `Malformed pageNum. Given ${pageNum}`);

        pageNum = `?page=${pageNum}`;
    } else {
        pageNum = '';
    }

    this.shouldChangeRoute(() => {
        page(`/deck/${deckID}/view/cards${pageNum}`);
    });
};

Routes.prototype.toLibraryCards = Routes.prototype.toLibrary = function(toDeckID = NOT_SET, pageSort = NOT_SET, pageOrder = NOT_SET, pageNum = NOT_SET) {

    this.shouldChangeRoute(() => {

        if(toDeckID === NOT_SET) {
            this._store.resetStage();
            toDeckID = this._store.decks.currentID();
        }

        invariant(_.isNumber(filterInteger(toDeckID)) && toDeckID > 0, `Malformed toDeckID. Given ${toDeckID}`);

        if(pageNum === NOT_SET) {
            pageNum = this._store.cards.page();
        }

        if(pageOrder === NOT_SET) {
            pageOrder = this._store.cards.order();
        }

        switch(pageOrder) {

        case cardPagination.order.DESC:
            pageOrder = 'descending';
            break;

        case cardPagination.order.ASC:
            pageOrder = 'ascending';
            break;

        default:
            pageOrder = 'descending';
        }

        if(pageSort === NOT_SET) {
            pageSort = this._store.cards.sort();
        }

        switch(pageSort) {

        case cardPagination.sort.REVIEWED_AT:
            pageSort = 'reviewed_at';
            break;

        case cardPagination.sort.TIMES_REVIEWED:
            pageSort = 'times_reviewed';
            break;

        case cardPagination.sort.TITLE:
            pageSort = 'title';
            break;

        case cardPagination.sort.CREATED_AT:
            pageSort = 'created_at';
            break;

        case cardPagination.sort.UPDATED_AT:
            pageSort = 'updated_at';
            break;

        default:
            pageSort = 'updated_at';
        }

        page(`/deck/${toDeckID}/view/cards?order_by=${pageOrder}&sort_by=${pageSort}&page=${pageNum}`);
    });

};

Routes.prototype.toLibraryCardsPage = function(requestedPage) {

    requestedPage = filterInteger(requestedPage, 1);

    this.toLibraryCards(void 0, void 0, void 0, requestedPage);

};

Routes.prototype.toAddNewCard = function(toDeckID = NOT_SET) {

    this.shouldChangeRoute(() => {

        if(toDeckID === NOT_SET) {
            this._store.resetStage();
            toDeckID = this._store.decks.currentID();
        }

        page(`/deck/${toDeckID}/new/card`);
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

Routes.prototype.toDeckReview = function(toDeckID = NOT_SET) {

    this.shouldChangeRoute(() => {

        if(toDeckID === NOT_SET) {
            this._store.resetStage();
            toDeckID = this._store.decks.currentID();
        }

        page(`/deck/${toDeckID}/review/view/front`);
    });

};

Routes.prototype.toDeckReviewCardFront = function(deckID) {

    invariant(_.isNumber(filterInteger(deckID)) && deckID > 0, `Malformed deckID. Given ${deckID}`);

    this.shouldChangeRoute(() => {
        page(`/deck/${deckID}/review/view/front`);
    });
};

Routes.prototype.toDeckReviewCardBack = function(deckID) {

    invariant(_.isNumber(filterInteger(deckID)) && deckID > 0, `Malformed deckID. Given ${deckID}`);

    this.shouldChangeRoute(() => {
        page(`/deck/${deckID}/review/view/back`);
    });
};

Routes.prototype.toDeckReviewCardDescription = function(deckID) {

    invariant(_.isNumber(filterInteger(deckID)) && deckID > 0, `Malformed deckID. Given ${deckID}`);

    this.shouldChangeRoute(() => {
        page(`/deck/${deckID}/review/view/description`);
    });
};

Routes.prototype.toDeckReviewCardMeta = function(deckID) {

    invariant(_.isNumber(filterInteger(deckID)) && deckID > 0, `Malformed deckID. Given ${deckID}`);

    this.shouldChangeRoute(() => {
        page(`/deck/${deckID}/review/view/meta`);
    });
};

Routes.prototype.toDeckReviewCardStashes = function(deckID) {

    invariant(_.isNumber(filterInteger(deckID)) && deckID > 0, `Malformed deckID. Given ${deckID}`);

    this.shouldChangeRoute(() => {
        page(`/deck/${deckID}/review/view/stashes`);
    });
};

Routes.prototype.toAddNewDeck = function(toDeckID = NOT_SET) {

    this.shouldChangeRoute(() => {

        if(toDeckID === NOT_SET) {
            this._store.resetStage();
            toDeckID = this._store.decks.currentID();
        }

        page(`/deck/${toDeckID}/new/deck`);
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

Routes.prototype.toCard = function(cardID, deckID) {
    this.toCardFront(cardID, deckID);
};

Routes.prototype.toCardFront = function(cardID, deckID) {

    invariant(_.isNumber(filterInteger(cardID)) && cardID > 0, `Malformed cardID. Given ${cardID}`);
    invariant(_.isNumber(filterInteger(deckID)) && deckID > 0, `Malformed deckID. Given ${deckID}`);

    this.shouldChangeRoute(() => {
        page(`/deck/${deckID}/card/${cardID}/view/front`);
    });
};

Routes.prototype.toCardBack = function(cardID, deckID) {

    invariant(_.isNumber(filterInteger(cardID)) && cardID > 0, `Malformed cardID. Given ${cardID}`);

    this.shouldChangeRoute(() => {
        page(`/deck/${deckID}/card/${cardID}/view/back`);
    });
};

Routes.prototype.toCardDescription = function(cardID, deckID) {

    invariant(_.isNumber(filterInteger(cardID)) && cardID > 0, `Malformed cardID. Given ${cardID}`);

    this.shouldChangeRoute(() => {
        page(`/deck/${deckID}/card/${cardID}/view/description`);
    });
};

Routes.prototype.toCardMeta = function(cardID, deckID) {

    invariant(_.isNumber(filterInteger(cardID)) && cardID > 0, `Malformed cardID. Given ${cardID}`);

    this.shouldChangeRoute(() => {
        page(`/deck/${deckID}/card/${cardID}/view/meta`);
    });
};

Routes.prototype.toCardStashes = function(cardID, deckID) {

    invariant(_.isNumber(filterInteger(cardID)) && cardID > 0, `Malformed cardID. Given ${cardID}`);

    this.shouldChangeRoute(() => {
        page(`/deck/${deckID}/card/${cardID}/view/stashes`);
    });
};

Routes.prototype.toCardReview = function(cardID, deckID) {

    invariant(_.isNumber(filterInteger(cardID)) && cardID > 0, `Malformed cardID. Given ${cardID}`);
    invariant(_.isNumber(filterInteger(deckID)) && deckID > 0, `Malformed deckID. Given ${deckID}`);

    this.shouldChangeRoute(() => {
        page(`/deck/${deckID}/card/${cardID}/review/front`);
    });
};

Routes.prototype.toCardReviewFront = function(cardID, deckID) {

    invariant(_.isNumber(filterInteger(cardID)) && cardID > 0, `Malformed cardID. Given ${cardID}`);
    invariant(_.isNumber(filterInteger(deckID)) && deckID > 0, `Malformed deckID. Given ${deckID}`);

    this.shouldChangeRoute(() => {
        page(`/deck/${deckID}/card/${cardID}/review/front`);
    });
};

Routes.prototype.toCardReviewBack = function(cardID, deckID) {

    invariant(_.isNumber(filterInteger(cardID)) && cardID > 0, `Malformed cardID. Given ${cardID}`);
    invariant(_.isNumber(filterInteger(deckID)) && deckID > 0, `Malformed deckID. Given ${deckID}`);

    this.shouldChangeRoute(() => {
        page(`/deck/${deckID}/card/${cardID}/review/back`);
    });
};

Routes.prototype.toCardReviewDescription = function(cardID, deckID) {

    invariant(_.isNumber(filterInteger(cardID)) && cardID > 0, `Malformed cardID. Given ${cardID}`);
    invariant(_.isNumber(filterInteger(deckID)) && deckID > 0, `Malformed deckID. Given ${deckID}`);

    this.shouldChangeRoute(() => {
        page(`/deck/${deckID}/card/${cardID}/review/description`);
    });
};

Routes.prototype.toCardReviewStashes = function(cardID, deckID) {

    invariant(_.isNumber(filterInteger(cardID)) && cardID > 0, `Malformed cardID. Given ${cardID}`);
    invariant(_.isNumber(filterInteger(deckID)) && deckID > 0, `Malformed deckID. Given ${deckID}`);

    this.shouldChangeRoute(() => {
        page(`/deck/${deckID}/card/${cardID}/review/stashes`);
    });
};

Routes.prototype.toCardReviewMeta = function(cardID, deckID) {

    invariant(_.isNumber(filterInteger(cardID)) && cardID > 0, `Malformed cardID. Given ${cardID}`);
    invariant(_.isNumber(filterInteger(deckID)) && deckID > 0, `Malformed deckID. Given ${deckID}`);

    this.shouldChangeRoute(() => {
        page(`/deck/${deckID}/card/${cardID}/review/meta`);
    });
};

Routes.prototype.toSettings = function() {

    this.shouldChangeRoute(() => {
        page(`/settings`);
    });
};

Routes.prototype.toStashes = function(pageSort = NOT_SET, pageOrder = NOT_SET, pageNum = NOT_SET) {

    this.shouldChangeRoute(() => {

        if(pageNum === NOT_SET) {
            pageNum = this._store.stashes.page();
        }

        if(pageOrder === NOT_SET) {
            pageOrder = this._store.stashes.order();
        }

        switch(pageOrder) {

        case stashPagination.order.DESC:
            pageOrder = 'descending';
            break;

        case stashPagination.order.ASC:
            pageOrder = 'ascending';
            break;

        default:
            pageOrder = 'descending';
        }

        if(pageSort === NOT_SET) {
            pageSort = this._store.stashes.sort();
        }

        switch(pageSort) {

        case stashPagination.sort.NAME:
            pageSort = 'name';
            break;

        case stashPagination.sort.CREATED_AT:
            pageSort = 'created_at';
            break;

        case stashPagination.sort.UPDATED_AT:
            pageSort = 'updated_at';
            break;

        default:
            pageSort = 'updated_at';
        }


        page(`/stashes?order_by=${pageOrder}&sort_by=${pageSort}&page=${pageNum}`);
    });
};

Routes.prototype.toStashesPage = function(requestedPage) {

    requestedPage = filterInteger(requestedPage, 1);

    this.toStashes(void 0, void 0, requestedPage);
};

Routes.prototype.toAddNewStash = function() {

    this.shouldChangeRoute(() => {
        page(`/stashes/new`);
    });

};

Routes.prototype.toStash = function(stashID) {
    this.toStashCards(stashID, void 0, void 0, 1);
};

Routes.prototype.toStashCards = function(stashID = NOT_SET, pageSort = NOT_SET, pageOrder = NOT_SET, pageNum = NOT_SET) {

    this.shouldChangeRoute(() => {

        if(stashID === NOT_SET) {
            this._store.resetStage();
            stashID = this._store.stashes.currentID();
        }

        invariant(_.isNumber(filterInteger(stashID)) && stashID > 0, `Malformed stashID. Given ${stashID}`);

        if(pageNum === NOT_SET) {
            pageNum = this._store.cards.page();
        }

        if(pageOrder === NOT_SET) {
            pageOrder = this._store.cards.order();
        }

        switch(pageOrder) {

        case cardPagination.order.DESC:
            pageOrder = 'descending';
            break;

        case cardPagination.order.ASC:
            pageOrder = 'ascending';
            break;

        default:
            pageOrder = 'descending';
        }

        if(pageSort === NOT_SET) {
            pageSort = this._store.cards.sort();
        }

        switch(pageSort) {

        case cardPagination.sort.REVIEWED_AT:
            pageSort = 'reviewed_at';
            break;

        case cardPagination.sort.TIMES_REVIEWED:
            pageSort = 'times_reviewed';
            break;

        case cardPagination.sort.TITLE:
            pageSort = 'title';
            break;

        case cardPagination.sort.CREATED_AT:
            pageSort = 'created_at';
            break;

        case cardPagination.sort.UPDATED_AT:
            pageSort = 'updated_at';
            break;

        default:
            pageSort = 'updated_at';
        }

        page(`/stash/${stashID}/cards?order_by=${pageOrder}&sort_by=${pageSort}&page=${pageNum}`);
    });
};

Routes.prototype.toStashDescription = function(stashID = NOT_SET) {

    this.shouldChangeRoute(() => {

        if(stashID === NOT_SET) {
            this._store.resetStage();
            stashID = this._store.stashes.currentID();
        }

        invariant(_.isNumber(filterInteger(stashID)) && stashID > 0, `Malformed stashID. Given ${stashID}`);

        page(`/stash/${stashID}/description`);
    });
};

Routes.prototype.toStashMeta = function(stashID = NOT_SET) {

    this.shouldChangeRoute(() => {

        if(stashID === NOT_SET) {
            this._store.resetStage();
            stashID = this._store.stashes.currentID();
        }

        invariant(_.isNumber(filterInteger(stashID)) && stashID > 0, `Malformed stashID. Given ${stashID}`);

        page(`/stash/${stashID}/meta`);
    });
};

Routes.prototype.toStashCard = function(cardID, stashID) {
    this.toStashCardFront(cardID, stashID);
};

Routes.prototype.toStashCardFront = function(cardID, stashID) {

    invariant(_.isNumber(filterInteger(cardID)) && cardID > 0, `Malformed cardID. Given ${cardID}`);

    this.shouldChangeRoute(() => {
        page(`/stash/${stashID}/card/${cardID}/view/front`);
    });
};

Routes.prototype.toStashCardBack = function(cardID, stashID) {

    invariant(_.isNumber(filterInteger(cardID)) && cardID > 0, `Malformed cardID. Given ${cardID}`);

    this.shouldChangeRoute(() => {
        page(`/stash/${stashID}/card/${cardID}/view/back`);
    });
};

Routes.prototype.toStashCardDescription = function(cardID, stashID) {

    invariant(_.isNumber(filterInteger(cardID)) && cardID > 0, `Malformed cardID. Given ${cardID}`);

    this.shouldChangeRoute(() => {
        page(`/stash/${stashID}/card/${cardID}/view/description`);
    });
};

Routes.prototype.toStashCardMeta = function(cardID, stashID) {

    invariant(_.isNumber(filterInteger(cardID)) && cardID > 0, `Malformed cardID. Given ${cardID}`);

    this.shouldChangeRoute(() => {
        page(`/stash/${stashID}/card/${cardID}/view/meta`);
    });
};

Routes.prototype.toStashCardStashes = function(cardID, stashID) {

    invariant(_.isNumber(filterInteger(cardID)) && cardID > 0, `Malformed cardID. Given ${cardID}`);

    this.shouldChangeRoute(() => {
        page(`/stash/${stashID}/card/${cardID}/view/stashes`);
    });
};

Routes.prototype.toStashReview = function(toStashID = NOT_SET) {

    this.shouldChangeRoute(() => {

        if(toStashID === NOT_SET) {
            this._store.resetStage();
            toStashID = this._store.stashes.currentID();
        }

        page(`/stash/${toStashID}/review/view/front`);
    });

};

Routes.prototype.toStashReviewCardFront = function(stashID) {

    invariant(_.isNumber(filterInteger(stashID)) && stashID > 0, `Malformed stashID. Given ${stashID}`);

    this.shouldChangeRoute(() => {
        page(`/stash/${stashID}/review/view/front`);
    });
};

Routes.prototype.toStashReviewCardBack = function(stashID) {

    invariant(_.isNumber(filterInteger(stashID)) && stashID > 0, `Malformed stashID. Given ${stashID}`);

    this.shouldChangeRoute(() => {
        page(`/stash/${stashID}/review/view/back`);
    });
};

Routes.prototype.toStashReviewCardDescription = function(stashID) {

    invariant(_.isNumber(filterInteger(stashID)) && stashID > 0, `Malformed stashID. Given ${stashID}`);

    this.shouldChangeRoute(() => {
        page(`/stash/${stashID}/review/view/description`);
    });
};

Routes.prototype.toStashReviewCardMeta = function(stashID) {

    invariant(_.isNumber(filterInteger(stashID)) && stashID > 0, `Malformed stashID. Given ${stashID}`);

    this.shouldChangeRoute(() => {
        page(`/stash/${stashID}/review/view/meta`);
    });
};


module.exports = {
    bootstrap: boostrapRoutes,
    types: ROUTE,
    Routes: Routes
};
