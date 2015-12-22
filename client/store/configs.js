const _ = require('lodash');
const co = require('co');
const superhot = require('./superhot');

const {Response, NOT_FOUND, OK, INVALID} = require('./response');


function Config(inputs) {

    if(!(this instanceof Config)) {
        return new Config(inputs);
    }

    if(!_.has(inputs, 'setting') || !_.has(inputs, 'value')) {
        throw new Error('invalid inputs to Config');
    }

    this.setting = inputs.setting;
    this.value = inputs.value;
}

Config.prototype.constructor = Config;

function Configs(store) {
    this._store = store;
}

Configs.prototype.constructor = Configs;

Configs.prototype.get = co.wrap(function *(name) {

    return new Promise(function(resolve, reject) {

        superhot
            .get(`/api/configs/${name}`)
            .end(function(err, response) {

                switch(response.status) {

                case 404:

                    // config not set
                    return resolve(new Response(void 0, NOT_FOUND, void 0));

                case 200:

                    const entry = new Config({
                        setting: response.body.setting,
                        value: response.body.value
                    });

                    return resolve(new Response(void 0, OK, entry));

                default:

                    if (err) {
                        return reject(err);
                    }

                    return resolve(new Response(err, INVALID, void 0));
                };

            });

    });

});

Configs.prototype.set = co.wrap(function *(name, value) {

    const request = {
        value: String(value)
    };

    return new Promise(function(resolve, reject) {

        superhot
            .post(`/api/configs/${name}`)
            .type('json')
            .send(request)
            .end(function(err, response) {

                switch(response.status) {

                case 200:

                    const entry = new Config({
                        setting: response.body.setting,
                        value: response.body.value
                    });

                    return resolve(new Response(void 0, OK, entry));

                default:

                    if (err) {
                        return reject(err);
                    }

                    return resolve(new Response(err, INVALID, void 0));
                }

            });

    });

});

module.exports = {
    Config,
    Configs
};
