const Immutable = require('immutable');
const co = require('co');
const _ = require('lodash');
const invariant = require('invariant');
const DataLoader = require('dataloader');
const minitrue = require('minitrue');

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
    this._lookup = minitrue({}); // Map<deck_id<int>, Deck>

}

Decks.prototype.constructor = Decks;

// clear lookup table
Decks.prototype.clearCache = function() {
    deckLoader.clearAll();
    this._lookup.update(function() {
        return Immutable.Map();
    });
};

// load and cache deck onto lookup table
Decks.prototype.load = co.wrap(function *(deckID = NOT_SET) {

    if(deckID === NOT_SET) {
        return Promise.resolve(void 0);
    }


    return deckLoader.load(deckID)
        .then((deck) => {

            deckID = Number(deckID);

            // cache onto lookup table

            this._lookup.cursor(deckID).update(function() {
                return Immutable.fromJS(deck);
            });

            return deck;
        });

});

Decks.prototype.loadMany = co.wrap(function *(deckIDs) {

    invariant(_.isArray(deckIDs), 'Expected array.');

    return deckLoader.loadMany(deckIDs)
        .then((decks) => {

            // cache onto lookup table

            _.forEach(decks, (deck) => {
                // TODO: room for optimization
                this._lookup.cursor(deck.id).update(function() {
                    return Immutable.fromJS(deck);
                });
            });

            return decks;
        });

});

Decks.prototype.get = function(deckID) {

    deckID = Number(deckID);

    const deck = this._lookup.cursor(deckID).deref(NOT_SET);

    if(deck === NOT_SET) {
        return co.wrap(function *(self) {

            yield self.load(deckID);

            return self._lookup.cursor(deckID).deref();

        })(this);

    }

    return Promise.resolve(deck);
};

Decks.prototype.getMany = function(deckIDs) {

    invariant(Immutable.List.isList(deckIDs), 'Expected Immutable.List.');

    deckIDs = deckIDs.map((deckID) => {
        return this.get(deckID);
    });

    return Promise.all(deckIDs);
};

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

    return value;
};

Decks.prototype.current = function() {

    const currentID = this.currentID();

    return this.get(currentID);
};

// get list of children decks for current deck
Decks.prototype.children = function() {

    const currentID = this.currentID();

    return this.get(currentID)
        .then((currentDeck) => {

            const children = currentDeck.get('children');

            invariant(Immutable.List.isList(children),
                `Expected currentDeck.children to be Immutable.List. Given ${children}`);

            return this.getMany(children);
        });

};


module.exports = {
    Deck,
    Decks
};
