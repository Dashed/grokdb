const Immutable = require('immutable');
const _ = require('lodash');
const minitrue = require('minitrue');

const superhot = require('./superhot');

const {Response, NOT_FOUND, OK, INVALID} = require('./response');


function Cards(store) {

    this._store = store;
    this._lookup = minitrue({}); // Map<deck_id<int>, Deck>

}

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

module.exports = {
    Cards
};
