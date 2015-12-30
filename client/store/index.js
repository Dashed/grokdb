const minitrue = require('minitrue');

const bootstrap = require('./bootstrap');

const {Configs} = require('./configs');
const {Routes} = require('./routes');
const {Decks} = require('./decks');
const {Cards, pagination} = require('./cards');


// sentinel value
const NOT_SET = {};

const SCHEMA = {

    route: null,

    deck: {
        root: null, // deck_id
        self: null, // deck_id

        // TODO: not used; remove
        // children: [], // List<deck_id>

        // TODO: not used; remove
        // cards: [] // List<card_id>
    },

    card: {
        self: null,

        // pagination / filtering for list of cards in a deck
        sort: pagination.sort.UPDATED_AT,
        order: pagination.order.DESC,
        page: 1
    },

    // review:

    stashes: {
        self: null,
        list: [],
        cards: []
    }
};


function Store() {

    // Simple variable lock intended to be used for checking if the app state
    // has been reset earlier in a route redirect.
    // This ensures that the app state is not reset more than once.
    this._loading = false;

    this._state = minitrue(SCHEMA);
    this._stage = this._state.deref();

    this.routes = new Routes(this);
    this.decks = new Decks(this);
    this.cards = new Cards(this);
    this.configs = new Configs(this);
}

Store.prototype.constructor = Store;

Store.prototype.loading = function(loading = NOT_SET) {

    if(loading !== NOT_SET) {
        this._loading = loading;
    }

    return this._loading;
};

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

module.exports = bootstrap(new Store());
