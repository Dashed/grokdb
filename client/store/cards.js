const Immutable = require('immutable');
const _ = require('lodash');
const minitrue = require('minitrue');
const invariant = require('invariant');
const DataLoader = require('dataloader');

const superhot = require('./superhot');

const {Response, OK, INVALID} = require('./response');

const NOT_SET = {};

const cardLoader = new DataLoader(function(keys) {

    return new Promise(function(resolve, reject) {

        if(keys.length <= 0) {
            resolve([]);
            return;
        }

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


function Cards(store) {

    this._store = store;
    this._lookup = minitrue({}); // Map<card_id<int>, Card>

}

// clear lookup table
// sync
Cards.prototype.clearCache = function() {
    cardLoader.clearAll();
    this._lookup.update(function() {
        return Immutable.Map();
    });
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

                    const card = Immutable.fromJS(response.body);
                    cardID = Number(card.id);

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

                if(!newCard) {
                    return;
                }

                observer.call(null, newCard, oldCard);
            });
        }
    };
};

// fetch/set current card id from app state
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
            if(Immutable.Map.isMap(oldCurrent) && Immutable.is(snapshotCurrent, newCurrent)) {
                snapshotCurrent = newCurrent;
                return;
            }

            snapshotCurrent = newCurrent;

            observer.call(null);
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

                    const card = Immutable.fromJS(response.body);
                    const cardID = Number(card.id);

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
Cards.prototype.currentCardsID = function() {

    const currentID = this._store.decks.currentID();

    return new Promise((resolve, reject) => {

        superhot
            .get(`/api/decks/${currentID}/cards`)
            .end((err, response) => {

                switch(response.status) {

                case 200:

                    invariant(_.isArray(response.body), `Expected array. Given ${response.body}`);

                    const result = _.map(response.body, (card) => {

                        const cardID = card.id;

                        card = Immutable.fromJS(card);

                        this._lookup.cursor(cardID).update(function() {
                            return card;
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

module.exports = {
    Cards
};
