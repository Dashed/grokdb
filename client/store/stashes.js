const Immutable = require('immutable');
const minitrue = require('minitrue');
const _ = require('lodash');

const superhot = require('./superhot');

const {Response, OK, INVALID} = require('./response');

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

}

Stashes.prototype.constructor = Stashes;

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

module.exports = {
    Stashes
};
