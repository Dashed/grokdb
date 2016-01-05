const Immutable = require('immutable');
const _ = require('lodash');
const minitrue = require('minitrue');
const DataLoader = require('dataloader');

const filterInteger = require('utils/filterinteger');
const superhot = require('./superhot');
const difficulty = require('constants/difficulty');

const NOT_SET = {};

const reviewDeckCardLoader = new DataLoader(function(keys) {

    if(keys.length <= 0) {
        return Promise.resolve([]);
    }

    const promiseArray = _.reduce(keys, (accumulator, deckID) => {

        const prom = new Promise((resolve, reject) => {

            superhot
                .get(`/api/decks/${deckID}/review`)
                .end((err, response) => {

                    switch(response.status) {

                    case 200:

                        const card = Immutable.fromJS(response.body);

                        return resolve(card);
                        break;

                    case 404:

                        return resolve(void 0);
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

function ReviewPatch(cardID) {

    this._cardID = cardID;
    this._difficulty = void 0;
    this._skipCard = false;
    this._stashID = void 0;
    this._deckID = void 0;
}

ReviewPatch.prototype.cardID = function(cardID = NOT_SET) {

    if(cardID !== NOT_SET) {
        this._cardID = cardID;
    }

    return this._cardID;

};

ReviewPatch.prototype.difficulty = function(difficultyTag = NOT_SET) {

    if(difficultyTag !== NOT_SET) {

        switch(difficultyTag) {

        case difficulty.forgot:
        case difficulty.hard:
        case difficulty.fail:
        case difficulty.good:
        case difficulty.easy:
        case difficulty.none:
            break;
        default:
            throw Error(`Unexpected difficultyTag. Given ${String(difficultyTag)}`);
        }

        this._difficulty = difficultyTag;
    }

    return this._difficulty;

};

ReviewPatch.prototype.skipCard = function(skipCard = NOT_SET) {

    if(skipCard !== NOT_SET) {

        if(!_.isBoolean(skipCard)) {
            throw Error(`Expected skipCard to be boolean. Given: ${skipCard}`);
        }

        this._skipCard = skipCard;
    }

    return this._skipCard;
};

ReviewPatch.prototype.stash = function(stashID = NOT_SET) {

    if(stashID !== NOT_SET) {
        this._stashID = Number(stashID);
    }

    return this._stashID;
};

ReviewPatch.prototype.deck = function(deckID = NOT_SET) {

    if(deckID !== NOT_SET) {
        this._deckID = Number(deckID);
    }

    return this._deckID;
};


function Review(store) {

    this._store = store;

    this._lookup = minitrue({});

}

// clear lookup table
// sync
Review.prototype.clearCache = function() {

    reviewDeckCardLoader.clearAll();

    this._lookup.update(function() {
        return Immutable.Map();
    });
};

// async
// Review.prototype.reviewCard = function(cardID, difficultyTag, skipCard = false) {
Review.prototype.reviewCard = function(reviewPatch) {

    if(!(reviewPatch instanceof ReviewPatch)) {
        throw Error(`Unexpected action. Given: ${reviewPatch}`);
    }

    const cardID = reviewPatch.cardID();
    const skipCard = reviewPatch.skipCard();
    const difficultyTag = reviewPatch.difficulty();

    const action = (function() {

        if(skipCard) {
            return 'skip';
        }

        switch(difficultyTag) {

        case difficulty.forgot:
            return 'forgot';
            break;

        case difficulty.hard:
        case difficulty.fail:
            return 'fail';
            break;

        case difficulty.good:
        case difficulty.easy:
            return 'success';
            break;

        default:
            throw Error(`Unexpected difficultyTag. Given ${String(difficultyTag)}`);
        }

    })();

    let patch = {
        action: action
    };

    if(!skipCard) {
        switch(difficultyTag) {

        case difficulty.forgot:
            patch.changelog = 'Forgot card.';
            break;

        case difficulty.hard:
            patch.value = 4;
            patch.changelog = 'Card was hard.';
            break;

        case difficulty.fail:
            patch.value = 1;
            patch.changelog = 'Answered card unsuccessfully.';
            break;

        case difficulty.good:
            patch.value = 1;
            patch.changelog = 'Answered card successfully.';
            break;

        case difficulty.easy:
            patch.value = 3;
            patch.changelog = 'Easily answered card.';
            break;

        default:
            throw Error(`Unexpected difficultyTag. Given ${difficultyTag}`);
        }
    } else {
        patch.changelog = 'Skipping card.';
    }

    if(filterInteger(reviewPatch.deck(), NOT_SET) !== NOT_SET) {

        patch.deck = reviewPatch.deck();

    } else if(filterInteger(reviewPatch.stash(), NOT_SET) !== NOT_SET) {

        patch.stash = reviewPatch.stash();
    }

    return new Promise((resolve, reject) => {

        superhot
            .patch(`/api/cards/${cardID}/review`)
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

                    if (err) {
                        return reject(err);
                    }

                    return reject(Error(`Unexpected response.status. Given: ${response.status}`));
                }
            });

    });

};

// card id being reviewed within deck
// sync
Review.prototype.cardIDOfDeck = function(cardID = NOT_SET) {

    let value = cardID;
    const cursor = this._lookup.cursor('cardIDOfDeck');

    if(cardID === NOT_SET) {
        value = cursor.deref();
    } else {
        cursor.update(function() {
            return Number(value);
        });
    }

    return Number(value);
};

// sync
Review.prototype.hasCardIDOfDeck = function() {
    return filterInteger(this.cardIDOfDeck(), NOT_SET) !== NOT_SET;
};

// sync
Review.prototype.watchCardOfCurrentDeck = function() {

    return {
        observe: (observer) => {

            let currentID = this.cardIDOfDeck();
            let currentCursor = this._store.cards._lookup.cursor(currentID);
            let currentUnsub = attachCurrentObserver(currentCursor, currentID, observer);

            const cardSelfCursor = this._lookup.cursor('cardIDOfDeck');

            const cardSelfUnsub = cardSelfCursor.observe((newID/*, oldID*/) => {

                // invariant: newID != oldID

                if(newID == currentID || !_.isNumber(newID)) {
                    return;
                }

                currentUnsub.call(null);

                // ensure new card is on lookup table
                Promise.resolve(this._store.cards.get(newID))
                    .then(() => {

                        currentID = newID;
                        currentCursor = this._store.cards._lookup.cursor(currentID);
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

// card id being reviewed within stash
// sync
Review.prototype.cardIDOfStash = function(cardID = NOT_SET) {

    let value = cardID;
    const cursor = this._lookup.cursor('cardIDOfStash');

    if(cardID === NOT_SET) {
        value = cursor.deref();
    } else {
        cursor.update(function() {
            return Number(value);
        });
    }

    return Number(value);
};

// sync
Review.prototype.hasCardIDOfStash = function() {
    return filterInteger(this.cardIDOfStash(), NOT_SET) !== NOT_SET;
};

// sync
Review.prototype.watchCardOfCurrentStash = function() {
    return this._lookup.cursor('cardIDOfStash');
};

// get reviewable card for deck
// async
Review.prototype.deck = function() {

    const currentID = this._store.decks.currentID();

    return reviewDeckCardLoader.load(currentID)
        .then((card) => {

            if(!Immutable.Map.isMap(card)) {

                // TODO: error handling. this is an invariant violation

                this.cardIDOfDeck(void 0);

                return card;
            }

            const cardID = Number(card.get('id'));

            this.cardIDOfDeck(cardID);

            // cache this card
            this._store.cards._lookup.cursor(cardID).update(function() {
                return card;
            });

            return card;
        });
};

// async
Review.prototype.getNextReviewableCardForDeck = function() {

    // clear any cache
    const currentID = this._store.decks.currentID();
    reviewDeckCardLoader.clear(currentID);

    return this.deck();
};

// async
Review.prototype.getReviewableCardForDeck = function() {

    if(this.hasCardIDOfDeck()) {

        const cardID = this.cardIDOfDeck();

        return this._store.cards.get(cardID);
    }

    return this.deck();

};

// get reviewable card for stash
// async
Review.prototype.stash = function() {
    // TODO: complete
};

// async
Review.prototype.getReviewableCardForStash = function() {

    if(this.hasCardIDOfStash()) {

        const cardID = this.cardIDOfStash();

        return this._store.cards.get(cardID);
    }

    return this.stash();

};

module.exports = {
    Review,
    ReviewPatch
};

/* helpers */

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
