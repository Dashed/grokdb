const React = require('react');
const co = require('co');

const courier = require('courier');


const DecksList = React.createClass({
    render() {
        return (
            <div>
                {'decks list'}
            </div>
        );
    }
});


module.exports = courier({

    component: DecksList,

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    assignNewProps: function(props, context) {

        return co(function *() {

            const decks = yield context.store.decks.children();

            return {
                decks: decks
            };

        });

    }

});
