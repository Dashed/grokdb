const React = require('react');
const Immutable = require('immutable');

const courier = require('courier');

const Header = React.createClass({

    propTypes: {
        currentDeck: React.PropTypes.instanceOf(Immutable.Map).isRequired
    },

    render() {

        const {currentDeck} = this.props;

        const deckName = currentDeck.get('name');
        const deckID = currentDeck.get('id');

        return (
            <h4>
                <span className="text-muted lead">{`Deck #${deckID}`}</span>
                {' '}
                <span>{deckName}</span>
            </h4>
        );
    }
});

module.exports = courier({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    component: Header,

    onlyWaitingOnMount: true,

    watch(props, manual, context) {
        return context.store.decks.watchCurrent();
    },

    assignNewProps: function(props, context) {

        return context.store.decks.current()
            .then(function(currentDeck) {

                return {
                    currentDeck: currentDeck
                };
            });
    }
});
