const React = require('react');
const Immutable = require('immutable');

const courier = require('courier');

const DumbDeckListItem = require('components/deck/listitem');
const DeckListItemWaiting = require('components/deck/waitinglistitem');

const DeckListItem = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        deckID: React.PropTypes.number.isRequired,
        deck: React.PropTypes.instanceOf(Immutable.Map).isRequired
    },

    onClick() {

        this.context.store.routes.toDeck(this.props.deckID, 1);
    },

    render() {

        const {deck, deckID} = this.props;

        return (
            <DumbDeckListItem
                deck={deck}
                deckID={deckID}
                onClick={this.onClick}
            />
        );
    }
});


module.exports = courier({

    component: DeckListItem,
    waitingComponent: DeckListItemWaiting,

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        deckID: React.PropTypes.number.isRequired
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

        const deckID = props.deckID;

        return context.store.decks.get(deckID)
            .then(function(deck) {
                return {
                    deck: deck
                };
            });
    }
});
