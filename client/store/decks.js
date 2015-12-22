const Immutable = require('immutable');
const co = require('co');
const _ = require('lodash');
const superhot = require('./superhot');

const {Response, NOT_FOUND, OK, INVALID} = require('./response');

const NOT_SET = {};

function Deck(inputs) {

    if(!(this instanceof Deck)) {
        return new Deck(inputs);
    }

    if(!_.has(inputs, 'name')) {
        throw new Error('invalid inputs to Deck');
    }

    this.id = inputs.id;
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
    this._lookup = Immutable.Map(); // Map<int, Deck>

}

Decks.prototype.constructor = Decks;

Decks.prototype.create = co.wrap(function *(createDeck) {

    if(!_.has(createDeck, 'name')) {
        throw new Error('invalid inputs to Deck.create');
    }

    return new Promise(function(resolve, reject) {

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
            .end(function(err, response) {

                console.log(err, response);

                switch(response.status) {

                case 200:

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

});

Decks.prototype.exists = co.wrap(function *(deckID) {

    deckID = Number(deckID);

    return new Promise(function(resolve, reject) {

        superhot
            .head(`/api/decks/${deckID}`)
            .end(function(err, response) {

                switch(response.status) {

                case 404:

                    return resolve(new Response(void 0, NOT_FOUND, false));

                case 200:

                    return resolve(new Response(void 0, OK, true));

                default:

                    if (err) {
                        return reject(err);
                    }

                    return resolve(new Response(err, INVALID, void 0));
                }

            });
    });

});

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
Decks.prototype.current = function(deckID = NOT_SET) {

    let stage = this._store.stage();

    let value = stage.getIn(['deck', 'self']);

    if(deckID !== NOT_SET) {

        stage = stage.updateIn(['deck', 'self'], function() {
            return deckID;
        });

        this._store.stage(stage);

        value = deckID;
    }

    return value;
};

// // clear lookup table
// Decks.prototype.clearAll = function() {

// };

// Decks.prototype.clear = function(deckID) {

// };

// // returns Promise wrapping Option
// Decks.prototype.get = function(deckID) {

// };


module.exports = {
    Deck,
    Decks
};
