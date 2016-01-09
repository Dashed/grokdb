const Immutable = require('immutable');
const minitrue = require('minitrue');
const _ = require('lodash');
const invariant = require('invariant');
const DataLoader = require('dataloader');

const filterInteger = require('utils/filterinteger');
const superhot = require('./superhot');

const {Response, OK, INVALID, NOT_FOUND} = require('./response');
const {perPage} = require('constants/stashespagination');

const NOT_SET = {};

const SORT = {
    // REVIEWED_AT: Symbol(),
    // TIMES_REVIEWED: Symbol(),
    NAME: Symbol(),
    CREATED_AT: Symbol(),
    UPDATED_AT: Symbol()
};

const ORDER = {
    ASC: Symbol(),
    DESC: Symbol()
};

const stashLoader = new DataLoader(function(keys) {

    if(keys.length <= 0) {
        return Promise.resolve([]);
    }

    return new Promise(function(resolve, reject) {

        keys = keys.join(',');

        superhot
            .get(`/api/stashes/bulk?stashes=${keys}`)
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

function Stash(inputs) {

    if(!(this instanceof Stash)) {
        return new Stash(inputs);
    }

    if(!_.has(inputs, 'name')) {
        throw new Error('invalid inputs to Stash');
    }

    this.id = Number(inputs.id);
    this.name = inputs.name;
    this.description = String(inputs.description) || '';
    this.created_at = inputs.created_at;
    this.updated_at = inputs.updated_at;
}

function Stashes(store) {

    this._store = store;
    this._lookup = minitrue({}); // Map<stash_id<int>, Stash<Immutable.Map>>

    // lookup table that defines the relationship between a stash and a card
    // i.e. if a card is within a stash
    this._lookupRelationshipStashCard = minitrue({}); // Map<[stash_id<int>, card_id<int>], bool>

}

Stashes.prototype.constructor = Stashes;

// clear lookup table
// sync
Stashes.prototype.clearCache = function() {

    stashLoader.clearAll();

    this._lookup.update(function() {
        return Immutable.Map();
    });

    this._lookupRelationshipStashCard.update(function() {
        return Immutable.Map();
    });
};

// get total number of stashes
// async
Stashes.prototype.totalStashes = function() {

    return new Promise((resolve, reject) => {

        superhot
            .get(`/api/stashes/total`)
            .end((err, response) => {

                switch(response.status) {

                case 200:

                    const numOfStashes = response.body.num_of_stashes >= 0 ? response.body.num_of_stashes : 0;

                    return resolve(numOfStashes);
                    break;

                default:

                    if (err) {
                        return reject(err);
                    }

                    return reject(Error(`Unexpected response.status. Given: ${response.status}`));
                }

            });

    });
};

// returns true/false
// sync
Stashes.prototype.stashHasCard = function(stashID, cardID) {

    invariant(filterInteger(stashID, NOT_SET) !== NOT_SET, `Unexpected stashID. Given ${stashID}`);
    invariant(filterInteger(cardID, NOT_SET) !== NOT_SET, `Unexpected cardID. Given ${cardID}`);

    return this._lookupRelationshipStashCard.cursor([stashID, cardID]).deref(false);

};

Stashes.prototype.setStashCardRelationship = function(stashID, cardID, relationshipStatus) {

    invariant(filterInteger(stashID, NOT_SET) !== NOT_SET, `Unexpected stashID. Given ${stashID}`);
    invariant(filterInteger(cardID, NOT_SET) !== NOT_SET, `Unexpected cardID. Given ${cardID}`);
    invariant(_.isBoolean(relationshipStatus), `Unexpected relationshipStatus. Given ${relationshipStatus}`);

    this._lookupRelationshipStashCard.cursor([stashID, cardID]).update(function() {
        return relationshipStatus;
    });

    return relationshipStatus;
};

Stashes.prototype.watchStashCardRelationship = function(stashID, cardID) {

    invariant(filterInteger(stashID, NOT_SET) !== NOT_SET, `Unexpected stashID. Given ${stashID}`);
    invariant(filterInteger(cardID, NOT_SET) !== NOT_SET, `Unexpected cardID. Given ${cardID}`);

    const cursor = this._lookupRelationshipStashCard.cursor([stashID, cardID]);

    return {
        observe: (observer) => {

            return cursor.observe(function(newRelationship, oldRelationship) {

                if(!_.isBoolean(newRelationship)) {
                    return;
                }

                observer.call(null, newRelationship, oldRelationship);
            });

        }
    };

};

Stashes.prototype.toggleRelationship = function(stashID, cardID, newRelationship) {

    invariant(filterInteger(stashID, NOT_SET) !== NOT_SET, `Unexpected stashID. Given ${stashID}`);
    invariant(filterInteger(cardID, NOT_SET) !== NOT_SET, `Unexpected cardID. Given ${cardID}`);
    invariant(_.isBoolean(newRelationship), `Unexpected newRelationship. Given ${newRelationship}`);

    // optimistic update
    this.setStashCardRelationship(stashID, cardID, newRelationship);

    return new Promise((resolve, reject) => {

        if(newRelationship) {

            superhot
                .put(`/api/cards/${cardID}/stashes/${stashID}`)
                .end((err, response) => {

                    switch(response.status) {
                    case 200:

                        return resolve(true);

                    default:

                        // revert optimistic update
                        this.setStashCardRelationship(stashID, cardID, !newRelationship);

                        if (err) {
                            return reject(err);
                        }

                        return reject(Error(`Unexpected response.status. Given: ${response.status}`));
                    }
                });

        } else {

            superhot
                .delete(`/api/cards/${cardID}/stashes/${stashID}`)
                .end((err, response) => {

                    switch(response.status) {
                    case 200:

                        return resolve(true);

                    default:

                        // revert optimistic update
                        this.setStashCardRelationship(stashID, cardID, !newRelationship);

                        if (err) {
                            return reject(err);
                        }

                        return reject(Error(`Unexpected response.status. Given: ${response.status}`));
                    }
                });

        }

    });

};

// load and cache stash onto lookup table
// async
Stashes.prototype.load = function(stashID = NOT_SET) {

    if(stashID === NOT_SET) {
        return Promise.resolve(void 0);
    }

    return stashLoader.load(stashID)
        .then((stash) => {

            stashID = Number(stashID);

            // cache onto lookup table

            stash = Immutable.fromJS(stash);

            this._lookup.cursor(stashID).update(function() {
                return stash;
            });

            return stash;
        });

};

// async
Stashes.prototype.get = function(stashID) {

    stashID = Number(stashID);

    const stash = this._lookup.cursor(stashID).deref(NOT_SET);

    if(stash === NOT_SET) {
        return this.load(stashID)
            .then(() => {
                return this._lookup.cursor(stashID).deref();
            });
    }

    return Promise.resolve(stash);
};

// async
Stashes.prototype.exists = function(stashID) {

    stashID = Number(stashID);

    return this.get(stashID)
        .then((stash) => {

            const result = Immutable.Map.isMap(stash);

            return new Response(void 0, result ? OK : NOT_FOUND, result);
        });
};

// get observable stash
// sync
Stashes.prototype.observable = function(stashID) {

    return {
        observe: (observer) => {

            const cursor = this._lookup.cursor(stashID);

            return cursor.observe(function(newStash, oldStash) {

                if(!Immutable.Map.isMap(newStash)) {
                    return;
                }

                observer.call(null, newStash, oldStash);
            });
        }
    };
};

// async
Stashes.prototype.create = function(createStash) {

    if(!_.has(createStash, 'name')) {
        throw new Error('invalid inputs to Stash.create');
    }

    return new Promise((resolve, reject) => {

        let request = {
            name: createStash.name,
        };

        if(_.has(createStash, 'description')) {
            request.description = String(createStash.description);
        }

        superhot
            .post(`/api/stashes`)
            .type('json')
            .send(request)
            .end((err, response) => {

                switch(response.status) {

                case 200:

                    const stashID = Number(response.body.id);
                    const stash = Immutable.fromJS(response.body);

                    this._lookup.cursor(stashID).update(function() {
                        return stash;
                    });

                    const record = new Stash(response.body);

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

// fetch/set current stash id from app state
Stashes.prototype.currentID = function(stashID = NOT_SET) {

    let stage = this._store.stage();

    let value = stage.getIn(['stash', 'self']);

    if(stashID !== NOT_SET) {

        stage = stage.updateIn(['stash', 'self'], function() {
            return stashID;
        });

        this._store.stage(stage);
        this._store.commit();

        value = stashID;
    }

    value = filterInteger(value);

    return value;
};

// sync
Stashes.prototype.watchPage = function() {
    return this._store.state().cursor(['stashes', 'page']);
};

// sync
Stashes.prototype.page = function(page = NOT_SET) {

    let stage = this._store.stage();

    let value = stage.getIn(['stashes', 'page']);

    if(page !== NOT_SET && Number(page) >= 0) {

        stage = stage.updateIn(['stashes', 'page'], function() {
            return Number(page);
        });

        this._store.stage(stage);
        this._store.commit();

        value = page;
    }

    return Number(value);
};

// sync
Stashes.prototype.watchSort = function() {
    return this._store.state().cursor(['stashes', 'sort']);
};

// sync
Stashes.prototype.sort = function(sort = NOT_SET) {

    let stage = this._store.stage();

    let value = stage.getIn(['stashes', 'sort']);

    if(sort !== NOT_SET) {

        stage = stage.updateIn(['stashes', 'sort'], function() {
            return sort;
        });

        this._store.stage(stage);
        this._store.commit();

        value = sort;
    }

    return value;
};

// sync
Stashes.prototype.watchOrder = function() {
    return this._store.state().cursor(['stashes', 'order']);
};

// sync
Stashes.prototype.order = function(order = NOT_SET) {

    let stage = this._store.stage();

    let value = stage.getIn(['stashes', 'order']);

    if(order !== NOT_SET) {

        stage = stage.updateIn(['stashes', 'order'], function() {
            return order;
        });

        this._store.stage(stage);
        this._store.commit();

        value = order;
    }

    return value;
};

// async
Stashes.prototype.list = function(page = NOT_SET, __pageSort = NOT_SET, __pageOrder = NOT_SET) {

    const pageNum = (function() {

        if(page === NOT_SET) {
            return this._store.stashes.page();
        }

        return Number(page);

    }).call(this);

    invariant(_.isNumber(pageNum) && pageNum >= 1, `Given ${pageNum}`);

    const pageSort = (() => {

        let sort = __pageSort !== NOT_SET ? __pageSort : this._store.stashes.sort();

        switch(sort) {

        case SORT.NAME:
            return 'name';
            break;

        case SORT.CREATED_AT:
            return 'created_at';
            break;

        case SORT.UPDATED_AT:
            return 'updated_at';
            break;

        default:
            throw Error(`Unexpected sort. Given ${sort}`);
        }

    })();

    const pageOrder = (() => {

        let order = __pageOrder !== NOT_SET ? __pageOrder : this._store.stashes.order();

        switch(order) {

        case ORDER.ASC:
            return 'ascending';
            break;

        case ORDER.DESC:
            return 'descending';
            break;

        default:
            throw Error(`Unexpected order. Given ${order}`);
        }

    })();

    return new Promise((resolve, reject) => {

        superhot
            .get(`/api/stashes`)
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

                    const result = _.map(response.body, (stash) => {

                        const stashID = stash.id;

                        this._lookup.cursor(stashID).update(function() {
                            return Immutable.fromJS(stash);
                        });

                        return stashID;
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

// sync
Stashes.prototype.watchPageOfCardBelongsTo = function() {
    return this._store.state().cursor(['card', 'stashes', 'belongs_to', 'page']);
};

// sync
Stashes.prototype.pageOfCardBelongsTo = function(page = NOT_SET) {

    let stage = this._store.stage();

    let value = stage.getIn(['card', 'stashes', 'belongs_to', 'page']);

    if(page !== NOT_SET && Number(page) >= 0) {

        stage = stage.updateIn(['card', 'stashes', 'belongs_to', 'page'], function() {
            return Number(page);
        });

        this._store.stage(stage);
        this._store.commit();

        value = page;
    }

    return Number(value);
};

// sync
Stashes.prototype.watchSortOfCardBelongsTo = function() {
    return this._store.state().cursor(['card', 'stashes', 'belongs_to', 'sort']);
};

// sync
Stashes.prototype.sortOfCardBelongsTo = function(sort = NOT_SET) {

    let stage = this._store.stage();

    let value = stage.getIn(['card', 'stashes', 'belongs_to', 'sort']);

    if(sort !== NOT_SET) {

        stage = stage.updateIn(['card', 'stashes', 'belongs_to', 'sort'], function() {
            return sort;
        });

        this._store.stage(stage);
        this._store.commit();

        value = sort;
    }

    return value;
};

// sync
Stashes.prototype.watchOrderOfCardBelongsTo = function() {
    return this._store.state().cursor(['card', 'stashes', 'belongs_to', 'order']);
};

// sync
Stashes.prototype.orderOfCardBelongsTo = function(order = NOT_SET) {

    let stage = this._store.stage();

    let value = stage.getIn(['card', 'stashes', 'belongs_to', 'order']);

    if(order !== NOT_SET) {

        stage = stage.updateIn(['card', 'stashes', 'belongs_to', 'order'], function() {
            return order;
        });

        this._store.stage(stage);
        this._store.commit();

        value = order;
    }

    return value;
};

// async
Stashes.prototype.listOfCardBelongsTo = function(cardID, page = NOT_SET, __pageSort = NOT_SET, __pageOrder = NOT_SET) {

    cardID = filterInteger(cardID, NOT_SET);

    invariant(cardID !== NOT_SET, `Expected cardID to be number. Given ${cardID}`);

    const pageNum = (function() {

        if(page === NOT_SET) {
            return this._store.stashes.pageOfCardBelongsTo();
        }

        return Number(page);

    }).call(this);

    invariant(_.isNumber(pageNum) && pageNum >= 1, `Given ${pageNum}`);

    const pageSort = (() => {

        let sort = __pageSort !== NOT_SET ? __pageSort : this._store.stashes.sortOfCardBelongsTo();

        switch(sort) {

        case SORT.NAME:
            return 'name';
            break;

        case SORT.CREATED_AT:
            return 'created_at';
            break;

        case SORT.UPDATED_AT:
            return 'updated_at';
            break;

        default:
            throw Error(`Unexpected sort. Given ${sort}`);
        }

    })();

    const pageOrder = (() => {

        let order = __pageOrder !== NOT_SET ? __pageOrder : this._store.stashes.orderOfCardBelongsTo();

        switch(order) {

        case ORDER.ASC:
            return 'ascending';
            break;

        case ORDER.DESC:
            return 'descending';
            break;

        default:
            throw Error(`Unexpected order. Given ${order}`);
        }

    })();

    return new Promise((resolve, reject) => {

        superhot
            .get(`/api/cards/${cardID}/stashes`)
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
            .query({
                'card': cardID
            })
            .end((err, response) => {

                switch(response.status) {

                case 200:

                    invariant(_.isArray(response.body), `Expected array. Given ${response.body}`);

                    const result = _.map(response.body, (stash) => {

                        const stashID = stash.id;

                        this.setStashCardRelationship(stashID, cardID, true);

                        this._lookup.cursor(stashID).update(function() {

                            return Immutable.fromJS(stash);
                        });

                        return stashID;
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

// sync
Stashes.prototype.watchPageAll = function() {
    return this._store.state().cursor(['card', 'stashes', 'all', 'page']);
};

// sync
Stashes.prototype.pageAll = function(page = NOT_SET) {

    let stage = this._store.stage();

    let value = stage.getIn(['card', 'stashes', 'all', 'page']);

    if(page !== NOT_SET && Number(page) >= 0) {

        stage = stage.updateIn(['card', 'stashes', 'all', 'page'], function() {
            return Number(page);
        });

        this._store.stage(stage);
        this._store.commit();

        value = page;
    }

    return Number(value);
};

// sync
Stashes.prototype.watchSortOfCardAll = function() {
    return this._store.state().cursor(['card', 'stashes', 'all', 'sort']);
};

// sync
Stashes.prototype.sortOfCardAll = function(sort = NOT_SET) {

    let stage = this._store.stage();

    let value = stage.getIn(['card', 'stashes', 'all', 'sort']);

    if(sort !== NOT_SET) {

        stage = stage.updateIn(['card', 'stashes', 'all', 'sort'], function() {
            return sort;
        });

        this._store.stage(stage);
        this._store.commit();

        value = sort;
    }

    return value;
};

// sync
Stashes.prototype.watchOrderOfCardAll = function() {
    return this._store.state().cursor(['card', 'stashes', 'all', 'order']);
};

// sync
Stashes.prototype.orderOfCardAll = function(order = NOT_SET) {

    let stage = this._store.stage();

    let value = stage.getIn(['card', 'stashes', 'all', 'order']);

    if(order !== NOT_SET) {

        stage = stage.updateIn(['card', 'stashes', 'all', 'order'], function() {
            return order;
        });

        this._store.stage(stage);
        this._store.commit();

        value = order;
    }

    return value;
};

// get total number of stashes
// async
Stashes.prototype.totalStashesByCard = function(cardID) {

    return new Promise((resolve, reject) => {

        superhot
            .get(`/api/cards/${cardID}/stashes/total`)
            .end((err, response) => {

                switch(response.status) {

                case 200:

                    const numOfStashes = response.body.num_of_stashes >= 0 ? response.body.num_of_stashes : 0;

                    return resolve(numOfStashes);
                    break;

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
Stashes.prototype.listOfCardAll = function(cardID, page = NOT_SET, __pageSort = NOT_SET, __pageOrder = NOT_SET) {

    cardID = filterInteger(cardID, NOT_SET);

    invariant(cardID !== NOT_SET, `Expected cardID to be number. Given ${cardID}`);

    const pageNum = (function() {

        if(page === NOT_SET) {
            return this._store.stashes.pageAll();
        }

        return Number(page);

    }).call(this);

    invariant(_.isNumber(pageNum) && pageNum >= 1, `Given ${pageNum}`);

    const pageSort = (() => {

        let sort = __pageSort !== NOT_SET ? __pageSort : this._store.stashes.sortOfCardAll();

        switch(sort) {

        case SORT.NAME:
            return 'name';
            break;

        case SORT.CREATED_AT:
            return 'created_at';
            break;

        case SORT.UPDATED_AT:
            return 'updated_at';
            break;

        default:
            throw Error(`Unexpected sort. Given ${sort}`);
        }

    })();

    const pageOrder = (() => {

        let order = __pageOrder !== NOT_SET ? __pageOrder : this._store.stashes.orderOfCardAll();

        switch(order) {

        case ORDER.ASC:
            return 'ascending';
            break;

        case ORDER.DESC:
            return 'descending';
            break;

        default:
            throw Error(`Unexpected order. Given ${order}`);
        }

    })();

    return new Promise((resolve, reject) => {

        superhot
            .get(`/api/stashes`)
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
            .query({
                'card': cardID
            })
            .end((err, response) => {

                switch(response.status) {

                case 200:

                    invariant(_.isArray(response.body), `Expected array. Given ${response.body}`);

                    const result = _.map(response.body, (stash) => {

                        const stashID = stash.id;

                        this.setStashCardRelationship(stashID, cardID, !!stash.has_card);

                        this._lookup.cursor(stashID).update(function() {

                            const stashAlt = _.assign({}, stash);
                            delete stashAlt.hasCard;

                            return Immutable.fromJS(stashAlt);
                        });

                        return stashID;
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
    Stashes,

    pagination: {
        sort: SORT,
        order: ORDER
    }
};
