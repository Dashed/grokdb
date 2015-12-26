const React = require('react');
const Immutable = require('immutable');

const courier = require('courier');

const DeckListItem = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        deckID: React.PropTypes.number.isRequired,
        deck: React.PropTypes.instanceOf(Immutable.Map).isRequired
    },

    onClick(event) {
        event.preventDefault();
        event.stopPropagation();

        this.context.store.routes.toDeck(this.props.deckID);
    },

    render() {

        const {deck} = this.props;

        return (
            <li className="list-group-item">
                <a href="#" onClick={this.onClick} >
                    {deck.get('name')}
                </a>
            </li>
        );
    }
});

// this is a placeholder component on initial load/mount to occupy the space
// that the component will cover in order to prevent any inducement of jank.
const DeckListItemWaiting = React.createClass({

    onClick(event) {
        event.preventDefault();
        event.stopPropagation();

    },

    render() {

        return (
            <li className="list-group-item">
                <a href="#" onClick={this.onClick} style={{color: '#ffffff'}} >
                    {'loading'}
                </a>
            </li>
        );
    }
});

module.exports = courier({

    component: DeckListItem,
    waitingComponent: DeckListItemWaiting,

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

        const deckID = props.deckID;

        return context.store.decks.get(deckID)
            .then(function(deck) {
                return {
                    deck: deck
                };
            });
    }
});
