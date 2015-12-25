const React = require('react');
const co = require('co');
const Immutable = require('immutable');

const courier = require('courier');

const DeckListItem = React.createClass({

    propTypes: {
        deck: React.PropTypes.instanceOf(Immutable.Map).isRequired
    },

    render() {

        const {deck} = this.props;

        return (
            <li className="list-group-item">
                {deck.get('name')}
            </li>
        );
    }
});

module.exports = courier({

    component: DeckListItem,

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    shouldRewatch(props) {

        const oldDeckID = this.currentProps.deckID;
        const newDeckID = props.deckID;

        return oldDeckID != newDeckID;
    },

    watch(props, manual, context) {

        const deckID = props.deckID;

        return context.store.decks.observable(deckID);
    },

    assignNewProps: function(props, context) {

        return co(function *() {

            const deckID = props.deckID;

            const deck = yield context.store.decks.get(deckID);

            return {
                deck: deck
            };

        });
    }
});
