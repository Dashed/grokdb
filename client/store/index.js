const minitrue = require('minitrue');

const bootstrap = require('./bootstrap');

const {Decks} = require('./decks');
const {Configs} = require('./configs');

// sentinel value
const NOT_SET = {};

const SCHEMA = {

    route: null,

    deck: {
        root: null,
        self: null,
        children: [],
        cards: []
    },

    card: {
        self: null
    },

    // review:

    stashes: {
        self: null,
        list: [],
        cards: []
    }
};


function Store() {

    this._state = minitrue(SCHEMA);
    this._stage = this._state.deref();

    this.decks = new Decks(this);
    this.configs = new Configs(this);
}

Store.prototype.constructor = Store;

// reference to app state
Store.prototype.state = function() {
    return this._state;
};

// like `git reset --hard HEAD`
Store.prototype.resetStage = function() {
    this._stage = this._state.deref();
};

// akin to `git stage`.
// This is an immutable snapshot of the app state (i.e. Immutable.Map).
//
// Stage changes before committing it
Store.prototype.stage = function(newStage = NOT_SET) {

    if(newStage !== NOT_SET) {
        this._stage = this._stage.mergeDeep(newStage);
    }

    return this._stage;
};

Store.prototype.commit = function() {
    return this._state.update((previous) => {

        this._stage = previous.mergeDeep(this._stage);

        return this._stage;
    });
};

Store.prototype.route = function(routeID = NOT_SET) {

    let value = this._stage.getIn(['route']);

    if(routeID !== NOT_SET) {

        this._stage = this._stage.updateIn(['route'], function() {
            return routeID;
        });

        value = routeID;
    }

    return value;
};


module.exports = bootstrap(new Store());
