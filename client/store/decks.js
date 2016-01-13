const Immutable = require('immutable');
const _ = require('lodash');
const invariant = require('invariant');
const DataLoader = require('dataloader');
const minitrue = require('minitrue');

const filterInteger = require('utils/filterinteger');
const superhot = require('./superhot');

const {Response, NOT_FOUND, OK, INVALID} = require('./response');

const NOT_SET = {};

const deckLoader = new DataLoader(function(keys) {

    return new Promise(function(resolve, reject) {

        if(keys.length <= 0) {
            resolve([]);
            return;
        }

        keys = keys.join(',');

        superhot
            .get(`/api/decks?decks=${keys}`)
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

function Deck(inputs) {

    if(!(this instanceof Deck)) {
        return new Deck(inputs);
    }

    if(!_.has(inputs, 'name')) {
        throw new Error('invalid inputs to Deck');
    }

    this.id = Number(inputs.id);
    this.name = inputs.name;
    this.description = String(inputs.description) || '';
    this.parent = Number(inputs.parent) || void 0;
    this.has_parent = !!inputs.has_parent;
    this.children = inputs.children;
    this.created_at = inputs.created_at;
    this.updated_at = inputs.updated_at;
}

Deck.prototype.constructor = Deck;

function Decks(store) {

    this._store = store;
    this._lookup = minitrue({}); // Map<deck_id<int>, Deck>

}

Decks.prototype.constructor = Decks;

// clear lookup table
// sync
Decks.prototype.clearCache = function() {
    deckLoader.clearAll();
    this._lookup.update(function() {
        return Immutable.Map();
    });
};

// load and cache deck onto lookup table
// async
Decks.prototype.load = function(deckID = NOT_SET) {

    if(deckID === NOT_SET) {
        return Promise.resolve(void 0);
    }

    return deckLoader.load(deckID)
        .then((deck) => {

            deckID = Number(deckID);

            // cache onto lookup table

            deck = Immutable.fromJS(deck);

            this._lookup.cursor(deckID).update(function() {
                return deck;
            });

            return deck;
        });

};

// async
Decks.prototype.loadMany = function(deckIDs) {

    invariant(_.isArray(deckIDs), 'Expected array.');

    return deckLoader.loadMany(deckIDs)
        .then((decks) => {

            // cache onto lookup table

            return _.map(decks, (deck) => {

                const deckID = Number(deck.id);
                deck = Immutable.fromJS(deck);

                // TODO: room for optimization
                this._lookup.cursor(deckID).update(function() {
                    return deck;
                });

                return deck;
            });
        });

};

// async
Decks.prototype.get = function(deckID) {

    deckID = Number(deckID);

    const deck = this._lookup.cursor(deckID).deref(NOT_SET);

    if(deck === NOT_SET) {
        return this.load(deckID)
            .then(() => {
                return this._lookup.cursor(deckID).deref();
            }, () => {
                return null;
            });
    }

    return Promise.resolve(deck);
};

// async
Decks.prototype.getMany = function(deckIDs) {

    invariant(Immutable.List.isList(deckIDs), 'Expected Immutable.List.');

    deckIDs = deckIDs.map((deckID) => {
        return this.get(deckID);
    });

    return Promise.all(deckIDs);
};

// get observable deck
// sync
Decks.prototype.observable = function(deckID) {

    return {
        observe: (observer) => {

            const cursor = this._lookup.cursor(deckID);

            return cursor.observe(function(newDeck, oldDeck) {

                if(!Immutable.Map.isMap(newDeck)) {
                    return;
                }

                observer.call(null, newDeck, oldDeck);
            });
        }
    };
};

// async
Decks.prototype.create = function(createDeck) {

    if(!_.has(createDeck, 'name')) {
        throw new Error('invalid inputs to Deck.create');
    }

    return new Promise((resolve, reject) => {

        let request = {
            name: createDeck.name,
        };

        if(_.has(createDeck, 'description')) {
            request.description = String(createDeck.description);
        }

        if(_.has(createDeck, 'parent')) {
            request.parent = Number(createDeck.parent);
        }

        superhot
            .post(`/api/decks`)
            .type('json')
            .send(request)
            .end((err, response) => {

                switch(response.status) {

                case 200:

                    const deckID = Number(response.body.id);
                    const deck = Immutable.fromJS(response.body);

                    this._lookup.cursor(deckID).update(function() {
                        return deck;
                    });

                    const record = new Deck(response.body);

                    return resolve(new Response(void 0, OK, record));

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
Decks.prototype.exists = function(deckID) {

    deckID = Number(deckID);

    return this.get(deckID)
        .then((deck) => {

            const result = Immutable.Map.isMap(deck);

            return new Response(void 0, result ? OK : NOT_FOUND, result);
        });

    // TODO: remove/clean up
    // return new Promise(function(resolve, reject) {

    //     superhot
    //         .head(`/api/decks/${deckID}`)
    //         .end(function(err, response) {

    //             switch(response.status) {

    //             case 404:

    //                 return resolve(new Response(void 0, NOT_FOUND, false));

    //             case 200:

    //                 return resolve(new Response(void 0, OK, true));

    //             default:

    //                 if (err) {
    //                     return reject(err);
    //                 }

    //                 return resolve(new Response(err, INVALID, void 0));
    //             }

    //         });
    // });

};

// sync
Decks.prototype.root = function(rootDeckID = NOT_SET) {

    let stage = this._store.stage();

    let value = stage.getIn(['deck', 'root']);

    if(rootDeckID !== NOT_SET) {

        stage = stage.updateIn(['deck', 'root'], function() {
            return rootDeckID;
        });

        this._store.stage(stage);

        value = rootDeckID;
    }

    return value;
};

// fetch/set current deck id from app state
Decks.prototype.currentID = function(deckID = NOT_SET) {

    let stage = this._store.stage();

    let value = stage.getIn(['deck', 'self']);

    if(deckID !== NOT_SET) {

        stage = stage.updateIn(['deck', 'self'], function() {
            return deckID;
        });

        this._store.stage(stage);

        value = deckID;
    }

    value = filterInteger(value, this.root());

    return value;
};

// async
Decks.prototype.current = function() {

    const currentID = this.currentID();

    return this.get(currentID);
};

Decks.prototype.watchCurrentID = function() {
    return this._store.state().cursor(['deck', 'self']);
};

// TODO: refactor to utils
const attachCurrentObserver = function(currentCursor, currentID, observer) {

    let snapshotCurrent = currentCursor.deref();

    const currentUnsub = currentCursor.observe(function(newCurrent, oldCurrent) {

        if(!Immutable.Map.isMap(newCurrent)) {
            // lookup table may have been cleared.
            // bail event propagation early.
            // note: don't unsubscribe at this point, as deck record may be reloaded.
            // e.g. entry: deck record --> void 0 --> deck record
            return;
        }

        const actualID = newCurrent.get('id');

        if(actualID == currentID && newCurrent != oldCurrent) {

            // There are cases when newCurrent and oldCurrent are effectively deeply equal.
            // This can occur when doing something equivalent to:
            // currentCursor.update(() => Immutable.fromJS(newCurrent.toJS()))
            // Immutable.is is deep compare, but should prevent unnecessary DOM renders or network requests.
            // Only do this if oldCurrent is still a Map.
            // We still call observer for the case: void 0 --> deck record
            if(!Immutable.is(snapshotCurrent, newCurrent)) {
                snapshotCurrent = newCurrent;
                observer.call(null);
                return;
            }

            snapshotCurrent = newCurrent;

            return;
        }

        // change occured on deck of unexpected id
        currentUnsub.call(null);

    });

    return currentUnsub;
};

// sync
Decks.prototype.watchCurrent = function() {

    return {
        observe: (observer) => {

            let currentID = this.currentID();
            let currentCursor = this._lookup.cursor(currentID);
            let currentUnsub = attachCurrentObserver(currentCursor, currentID, observer);

            const deckSelfCursor = this._store.state().cursor(['deck', 'self']);

            const deckSelfUnsub = deckSelfCursor.observe((newID/*, oldID*/) => {

                // invariant: newID != oldID

                if(newID == currentID) {
                    return;
                }

                currentUnsub.call(null);

                // ensure new deck is on lookup table
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
                deckSelfUnsub.call(null);
            };
        }
    };
};

// sync
Decks.prototype.childrenID = function() {

    let currentID = this.currentID();
    const deck = this._lookup.cursor(currentID).deref();

    invariant(Immutable.Map.isMap(deck), 'Expect current deck to be Immutable.Map');

    return deck.get('children');
};

// get ancestors of a deck as array of deck ids
// async
Decks.prototype.ancestors = function(deckID) {

    return this.get(deckID)
        .then((deck) => {
            // invariant: deck.get('ancestors') is Immutable.List
            return deck.get('ancestors').toArray();
        });

    // TODO: remove/clean up
    // return new Promise(function(resolve, reject) {

    //     superhot
    //         .get(`/api/decks/${deckID}/ancestors/id`)
    //         .end(function(err, response) {

    //             switch(response.status) {

    //             case 200:

    //                 invariant(_.isArray(response.body), `Expected array. Given ${response.body}`);

    //                 return resolve(response.body);

    //             default:

    //                 if (err) {
    //                     return reject(err);
    //                 }

    //                 return reject(Error(`Unexpected response.status. Given: ${response.status}`));
    //             }

    //         });
    // });
};

// fetch and resolve list of ancestors of deckID along with deckID itself
// async
Decks.prototype.path = function(deckID) {

    return this.ancestors(deckID)
        .then((ancestors) => {
            ancestors.push(deckID);

            ancestors = _.map(ancestors, this.get.bind(this));

            return Promise.all(ancestors);
        });
};

// async
Decks.prototype.patch = function(deckID, patch) {

    invariant(_.isPlainObject(patch), `Expected deck patch to be plain object. Given: ${patch}`);

    deckID = Number(deckID);

    const oldDeck = this._lookup.cursor(deckID).deref();

    // optimistic update
    this._lookup.cursor(deckID).update(function(__oldDeck) {

        patch = Immutable.fromJS(patch);

        return __oldDeck.mergeDeep(patch);
    });

    return new Promise((resolve, reject) => {

        superhot
            .patch(`/api/decks/${deckID}`)
            .send(patch)
            .end((err, response) => {

                switch(response.status) {

                case 200:

                    const deck = Immutable.fromJS(response.body);

                    this._lookup.cursor(deckID).update(function() {
                        return deck;
                    });

                    return resolve(deck);

                default:

                    // revert optimistic update
                    this._lookup.cursor(deckID).update(function() {
                        return oldDeck;
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
Decks.prototype.patchCurrent = function(patch) {
    this.patch(this.currentID(), patch);
};


module.exports = {
    Deck,
    Decks
};
