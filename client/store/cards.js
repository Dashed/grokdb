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
    this._lookup = minitrue({}); // Map<deck_id<int>, Deck>

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
        .then((deck) => {

            cardID = Number(cardID);

            // cache onto lookup table

            deck = Immutable.fromJS(deck);

            this._lookup.cursor(cardID).update(function() {
                return deck;
            });

            return deck;
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
