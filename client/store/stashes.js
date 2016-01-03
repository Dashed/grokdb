const minitrue = require('minitrue');

function Stashes(store) {

    this._store = store;
    this._lookup = minitrue({}); // Map<stash_id<int>, Stash<Immutable.Map>>

}

Stashes.prototype.constructor = Stashes;

module.exports = {
    Stashes
};
