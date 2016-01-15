const Immutable = require('immutable');
const _ = require('lodash');
const minitrue = require('minitrue');
const invariant = require('invariant');
const DataLoader = require('dataloader');

const filterInteger = require('utils/filterinteger');
const superhot = require('./superhot');

const {Response, OK, INVALID} = require('./response');
const {perPage} = require('constants/cardspagination');

const NOT_SET = {};

const SORT = {
    REVIEWED_AT: Symbol(),
    TIMES_REVIEWED: Symbol(),
    TITLE: Symbol(),
    CREATED_AT: Symbol(),
    UPDATED_AT: Symbol()
};

const ORDER = {
    ASC: Symbol(),
    DESC: Symbol()
};

const cardLoader = new DataLoader(function(keys) {

    if(keys.length <= 0) {
        return Promise.resolve([]);
    }

    return new Promise(function(resolve, reject) {

        keys = keys.join(',');

        superhot
            .get(`/api/cards?cards=${keys}`)
            .end(function(err, response) {

                switch(response.status) {

                case 200:

                    invariant(_.isArray(response.body), `Expected array. Given ${response.body}`);

                    return resolve(response.body);

                default:

                    if (err) {
                        return reject(err);
                    }

                    return reject(Error(`Unexpected response.status. Given: ${response.status}`));
                }

            });

    });
});

const cardsCountLoader = new DataLoader(function(keys) {

    if(keys.length <= 0) {
        return Promise.resolve([]);
    }

    const promiseArray = _.reduce(keys, (accumulator, deckID) => {

        const prom = new Promise((resolve, reject) => {

            superhot
                .get(`/api/decks/${deckID}/cards/count`)
                .end((err, response) => {

                    switch(response.status) {

                    case 200:

                        const numOfCards = response.body.num_of_cards >= 0 ? response.body.num_of_cards : 0;

                        return resolve(numOfCards);
                        break;

                    default:

                        if (err) {
                            return reject(err);
                        }

                        return reject(Error(`Unexpected response.status. Given: ${response.status}`));
                    }

                });

        });

        accumulator.push(prom);

        return accumulator;
    }, []);

    return Promise.all(promiseArray);
});

const cardsCountByStashLoader = new DataLoader(function(keys) {

    if(keys.length <= 0) {
        return Promise.resolve([]);
    }

    const promiseArray = _.reduce(keys, (accumulator, stashID) => {

        const prom = new Promise((resolve, reject) => {

            superhot
                .get(`/api/stashes/${stashID}/cards/count`)
                .end((err, response) => {

                    switch(response.status) {

                    case 200:

                        const numOfCards = response.body.num_of_cards >= 0 ? response.body.num_of_cards : 0;

                        return resolve(numOfCards);
                        break;

                    default:

                        if (err) {
                            return reject(err);
                        }

                        return reject(Error(`Unexpected response.status. Given: ${response.status}`));
                    }

                });

        });

        accumulator.push(prom);

        return accumulator;
    }, []);

    return Promise.all(promiseArray);
});

function Cards(store) {

    this._store = store;
    this._lookup = minitrue({}); // Map<card_id<int>, Card>

}

Cards.prototype.constructor = Cards;

// clear lookup table
// sync
Cards.prototype.clearCache = function() {
    cardLoader.clearAll();
    cardsCountLoader.clearAll();
    cardsCountByStashLoader.clearAll();
    this._lookup.update(function() {
        return Immutable.Map();
    });
};

// get total number of cards within given deck
// async
Cards.prototype.totalCards = function(deckID) {
    return cardsCountLoader.load(deckID);
};

// get total number of cards within given deck
// async
Cards.prototype.totalCardsByStash = function(stashID) {
    return cardsCountByStashLoader.load(stashID);
};

// load and cache card onto lookup table
// async
Cards.prototype.load = function(cardID = NOT_SET) {

    if(cardID === NOT_SET) {
        return Promise.resolve(void 0);
    }

    return cardLoader.load(cardID)
        .then((card) => {

            cardID = Number(cardID);

            // cache onto lookup table

            card = Immutable.fromJS(card);

            this._lookup.cursor(cardID).update(function() {
                return card;
            });

            return card;
        });

};

// async
Cards.prototype.loadByDeck = function(cardID = NOT_SET, deckID) {

    if(cardID === NOT_SET) {
        return Promise.resolve(void 0);
    }

    return new Promise((resolve, reject) => {

        superhot
            .get(`/api/decks/${deckID}/cards/${cardID}`)
            .end((err, response) => {

                switch(response.status) {

                case 200:

                    cardID = Number(response.body.id);
                    const card = Immutable.fromJS(response.body);

                    this._lookup.cursor(cardID).update(function() {
                        return card;
                    });

                    return resolve(card);

                default:

                    if (err) {
                        return reject(err);
                    }

                    return reject(Error(`Unexpected response.status. Given: ${response.status}`));
                }

            });
    });


};

// async
Cards.prototype.loadByStash = function(cardID = NOT_SET, stashID) {

    if(cardID === NOT_SET) {
        return Promise.resolve(void 0);
    }

    return new Promise((resolve, reject) => {

        superhot
            .get(`/api/stashes/${stashID}/cards/${cardID}`)
            .end((err, response) => {

                switch(response.status) {

                case 200:

                    cardID = Number(response.body.id);
                    const card = Immutable.fromJS(response.body);

                    this._lookup.cursor(cardID).update(function() {
                        return card;
                    });

                    return resolve(card);

                default:

                    if (err) {
                        return reject(err);
                    }

                    return reject(Error(`Unexpected response.status. Given: ${response.status}`));
                }

            });

    });

    return cardLoader.load(cardID)
        .then((card) => {

            cardID = Number(cardID);

            // cache onto lookup table

            card = Immutable.fromJS(card);

            this._lookup.cursor(cardID).update(function() {
                return card;
            });

            return card;
        });

};

// async
Cards.prototype.get = function(cardID) {

    cardID = Number(cardID);

    const card = this._lookup.cursor(cardID).deref(NOT_SET);

    if(card === NOT_SET) {
        return this.load(cardID)
            .then(() => {
                return this._lookup.cursor(cardID).deref();
            });
    }

    return Promise.resolve(card);
};

// get observable card
// sync
Cards.prototype.observable = function(cardID) {

    return {
        observe: (observer) => {

            const cursor = this._lookup.cursor(cardID);

            return cursor.observe(function(newCard, oldCard) {

                if(!Immutable.Map.isMap(newCard)) {
                    return;
                }

                observer.call(null, newCard, oldCard);
            });
        }
    };
};

Cards.prototype.watchCurrentID = function() {
    return this._store.state().cursor(['card', 'self']);
};

// fetch/set current card id from app state
// sync
Cards.prototype.currentID = function(cardID = NOT_SET) {

    let stage = this._store.stage();

    let value = stage.getIn(['card', 'self']);

    if(cardID !== NOT_SET) {

        stage = stage.updateIn(['card', 'self'], function() {
            return cardID;
        });

        this._store.stage(stage);

        value = cardID;
    }

    return Number(value);
};

// async
Cards.prototype.current = function() {

    const currentID = this.currentID();

    return this.get(currentID);
};

// TODO: factor out into utils
const attachCurrentObserver = function(currentCursor, currentID, observer) {

    let snapshotCurrent = currentCursor.deref();

    const currentUnsub = currentCursor.observe(function(newCurrent, oldCurrent) {

        if(!Immutable.Map.isMap(newCurrent)) {
            // lookup table may have been cleared.
            // bail event propagation early.
            // note: don't unsubscribe at this point, as card record may be reloaded.
            // e.g. entry: card record --> void 0 --> card record
            return;
        }

        const actualID = newCurrent.get('id');

        // Immutable.is is deep compare, but should prevent unnecessary DOM renders or network requests
        if(actualID == currentID && newCurrent != oldCurrent) {

            // There are cases when newCurrent and oldCurrent are effectively deeply equal.
            // This can occur when doing something equivalent to:
            // currentCursor.update(() => Immutable.fromJS(newCurrent.toJS()))
            // Immutable.is is deep compare, but should prevent unnecessary DOM renders or network requests.
            // Only do this if oldCurrent is still a Map.
            // We still call observer for the case: void 0 --> card record
            if(!Immutable.is(snapshotCurrent, newCurrent)) {
                snapshotCurrent = newCurrent;
                observer.call(null);
                return;
            }

            snapshotCurrent = newCurrent;

            return;
        }

        // change occured on card of unexpected id
        currentUnsub.call(null);

    });

    return currentUnsub;
};

// sync
Cards.prototype.watchCurrent = function() {

    return {
        observe: (observer) => {

            let currentID = this.currentID();
            let currentCursor = this._lookup.cursor(currentID);
            let currentUnsub = attachCurrentObserver(currentCursor, currentID, observer);

            const cardSelfCursor = this._store.state().cursor(['card', 'self']);

            const cardSelfUnsub = cardSelfCursor.observe((newID/*, oldID*/) => {

                // invariant: newID != oldID

                if(newID == currentID) {
                    return;
                }

                currentUnsub.call(null);

                // ensure new card is on lookup table
                Promise.resolve(this.get(newID))
                    .then(() => {

                        currentID = newID;
                        currentCursor = this._lookup.cursor(currentID);
                        currentUnsub = attachCurrentObserver(currentCursor, currentID, observer);

                        observer.call(null);

                        return null;
                    });

            });

            return function() {
                currentUnsub.call(null);
                cardSelfUnsub.call(null);
            };
        }
    };
};

// async
Cards.prototype.create = function(deckID, createCard) {

    if(!_.has(createCard, 'title')) {
        throw new Error('invalid inputs to Cards.create');
    }

    deckID = Number(deckID);

    return new Promise((resolve, reject) => {

        let request = {
            title: createCard.title,
            front: createCard.front,
            back: createCard.back,
            description: createCard.description
        };

        superhot
            .post(`/api/decks/${deckID}/cards`)
            .type('json')
            .send(request)
            .end((err, response) => {

                switch(response.status) {

                case 200:

                    const cardID = Number(response.body.id);
                    const card = Immutable.fromJS(response.body);

                    this._lookup.cursor(cardID).update(function() {
                        return card;
                    });

                    return resolve(new Response(void 0, OK, card));

                default:

                    if (err) {
                        return reject(err);
                    }

                    return resolve(new Response(err, INVALID, void 0));
                }

            });
    });

};

// async
Cards.prototype.remove = function(cardID) {

    cardID = Number(cardID);

    return new Promise((resolve, reject) => {

        superhot
            .del(`/api/cards/${cardID}`)
            .end((err, response) => {

                switch(response.status) {

                case 200:

                    return resolve(true);

                default:

                    if (err) {
                        return reject(err);
                    }

                    return resolve(Error(err));
                }

            });

    });
};

// async
Cards.prototype.currentCardsID = function() {

    const currentID = this._store.decks.currentID();

    return new Promise((resolve, reject) => {

        const pageNum = this._store.cards.page();

        invariant(_.isNumber(pageNum) && pageNum >= 1, `Given ${pageNum}`);

        const pageSort = (() => {

            switch(this._store.cards.sort()) {

            case SORT.REVIEWED_AT:
                return 'reviewed_at';
                break;

            case SORT.TIMES_REVIEWED:
                return 'times_reviewed';
                break;

            case SORT.TITLE:
                return 'title';
                break;

            case SORT.CREATED_AT:
                return 'created_at';
                break;

            case SORT.UPDATED_AT:
                return 'updated_at';
                break;

            default:
                throw Error(`Unexpected sort. Given ${this._store.cards.sort()}`);
            }

        })();

        const pageOrder = (() => {

            switch(this._store.cards.order()) {

            case ORDER.ASC:
                return 'ascending';
                break;

            case ORDER.DESC:
                return 'descending';
                break;

            default:
                throw Error(`Unexpected order. Given ${this._store.cards.order()}`);
            }

        })();

        superhot
            .get(`/api/decks/${currentID}/cards`)
            .query({
                'per_page': perPage
            })
            .query({
                'page': pageNum
            })
            .query({
                'sort_by': pageSort
            })
            .query({
                'order_by': pageOrder
            })
            .end((err, response) => {

                switch(response.status) {

                case 200:

                    invariant(_.isArray(response.body), `Expected array. Given ${response.body}`);

                    const result = _.map(response.body, (card) => {

                        const cardID = card.id;

                        this._lookup.cursor(cardID).update(function() {
                            return Immutable.fromJS(card);
                        });

                        return cardID;

                    });

                    return resolve(result);

                default:

                    if (err) {
                        return reject(err);
                    }

                    return reject(Error(`Unexpected response.status. Given: ${response.status}`));
                }

            });
    });

};

// async
Cards.prototype.currentCardsIDByStash = function(stashID) {

    invariant(filterInteger(stashID, NOT_SET) !== NOT_SET, `Given ${stashID}`);

    return new Promise((resolve, reject) => {

        const pageNum = this._store.cards.pageOfStash();

        invariant(_.isNumber(pageNum) && pageNum >= 1, `Given ${pageNum}`);

        const pageSort = (() => {

            switch(this._store.cards.sortOfStash()) {

            case SORT.REVIEWED_AT:
                return 'reviewed_at';
                break;

            case SORT.TIMES_REVIEWED:
                return 'times_reviewed';
                break;

            case SORT.TITLE:
                return 'title';
                break;

            case SORT.CREATED_AT:
                return 'created_at';
                break;

            case SORT.UPDATED_AT:
                return 'updated_at';
                break;

            default:
                throw Error(`Unexpected sort. Given ${this._store.cards.sortOfStash()}`);
            }

        })();

        const pageOrder = (() => {

            switch(this._store.cards.orderOfStash()) {

            case ORDER.ASC:
                return 'ascending';
                break;

            case ORDER.DESC:
                return 'descending';
                break;

            default:
                throw Error(`Unexpected order. Given ${this._store.cards.orderOfStash()}`);
            }

        })();

        superhot
            .get(`/api/stashes/${stashID}/cards`)
            .query({
                'per_page': perPage
            })
            .query({
                'page': pageNum
            })
            .query({
                'sort_by': pageSort
            })
            .query({
                'order_by': pageOrder
            })
            .end((err, response) => {

                switch(response.status) {

                case 200:

                    invariant(_.isArray(response.body), `Expected array. Given ${response.body}`);

                    const result = _.map(response.body, (card) => {

                        const cardID = card.id;

                        this._store.stashes.setStashCardRelationship(stashID, cardID, true);

                        this._lookup.cursor(cardID).update(function() {
                            return Immutable.fromJS(card);
                        });

                        return cardID;

                    });

                    return resolve(result);

                default:

                    if (err) {
                        return reject(err);
                    }

                    return reject(Error(`Unexpected response.status. Given: ${response.status}`));
                }

            });
    });

};

// async
Cards.prototype.patch = function(cardID, patch) {

    invariant(_.isPlainObject(patch), `Expected card patch to be plain object. Given: ${patch}`);

    cardID = Number(cardID);

    const oldCard = this._lookup.cursor(cardID).deref();

    // optimistic update
    this._lookup.cursor(cardID).update(function(__oldCard) {

        patch = Immutable.fromJS(patch);

        return __oldCard.mergeDeep(patch);
    });

    return new Promise((resolve, reject) => {

        superhot
            .patch(`/api/cards/${cardID}`)
            .send(patch)
            .end((err, response) => {

                switch(response.status) {

                case 200:

                    const card = Immutable.fromJS(response.body);

                    this._lookup.cursor(cardID).update(function() {
                        return card;
                    });

                    return resolve(card);

                default:

                    // revert optimistic update
                    this._lookup.cursor(cardID).update(function() {
                        return oldCard;
                    });

                    if (err) {
                        return reject(err);
                    }

                    return reject(Error(`Unexpected response.status. Given: ${response.status}`));
                }
            });

    });

};

// async
Cards.prototype.patchCurrent = function(patch) {
    this.patch(this.currentID(), patch);
};

// sync
Cards.prototype.watchSort = function() {
    return this._store.state().cursor(['card', 'sort']);
};

// sync
Cards.prototype.sort = function(sort = NOT_SET) {

    let stage = this._store.stage();

    let value = stage.getIn(['card', 'sort']);

    if(sort !== NOT_SET) {

        stage = stage.updateIn(['card', 'sort'], function() {
            return sort;
        });

        this._store.stage(stage);

        value = sort;
    }

    return value;
};

// sync
Cards.prototype.watchOrder = function() {
    return this._store.state().cursor(['card', 'order']);
};

// sync
Cards.prototype.order = function(order = NOT_SET) {

    let stage = this._store.stage();

    let value = stage.getIn(['card', 'order']);

    if(order !== NOT_SET) {

        stage = stage.updateIn(['card', 'order'], function() {
            return order;
        });

        this._store.stage(stage);

        value = order;
    }

    return value;
};

// sync
Cards.prototype.watchPage = function() {
    return this._store.state().cursor(['card', 'page']);
};

// sync
Cards.prototype.page = function(page = NOT_SET) {

    let stage = this._store.stage();

    let value = stage.getIn(['card', 'page']);

    if(page !== NOT_SET && Number(page) >= 0) {

        stage = stage.updateIn(['card', 'page'], function() {
            return Number(page);
        });

        this._store.stage(stage);

        value = page;
    }

    return Number(value);
};

// sync
Cards.prototype.changeSort = function(sort, order) {

    const currentDeckID = this._store.decks.currentID();

    this._store.routes.toLibraryCards(currentDeckID, sort, order);
};

// sync
Cards.prototype.watchSortOfStash = function() {
    return this._store.state().cursor(['stash', 'cards', 'sort']);
};

// sync
Cards.prototype.sortOfStash = function(sort = NOT_SET) {

    let stage = this._store.stage();

    let value = stage.getIn(['stash', 'cards', 'sort']);

    if(sort !== NOT_SET) {

        stage = stage.updateIn(['stash', 'cards', 'sort'], function() {
            return sort;
        });

        this._store.stage(stage);

        value = sort;
    }

    return value;
};

// sync
Cards.prototype.watchOrderOfStash = function() {
    return this._store.state().cursor(['stash', 'cards', 'order']);
};

// sync
Cards.prototype.orderOfStash = function(order = NOT_SET) {

    let stage = this._store.stage();

    let value = stage.getIn(['stash', 'cards', 'order']);

    if(order !== NOT_SET) {

        stage = stage.updateIn(['stash', 'cards', 'order'], function() {
            return order;
        });

        this._store.stage(stage);

        value = order;
    }

    return value;
};

// sync
Cards.prototype.watchPageOfStash = function() {
    return this._store.state().cursor(['stash', 'cards', 'page']);
};

// sync
Cards.prototype.pageOfStash = function(page = NOT_SET) {

    let stage = this._store.stage();

    let value = stage.getIn(['stash', 'cards', 'page']);

    if(page !== NOT_SET && Number(page) >= 0) {

        stage = stage.updateIn(['stash', 'cards', 'page'], function() {
            return Number(page);
        });

        this._store.stage(stage);

        value = page;
    }

    return Number(value);
};

module.exports = {

    Cards,

    pagination: {
        sort: SORT,
        order: ORDER
    }
};
