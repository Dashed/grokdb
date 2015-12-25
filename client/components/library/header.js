const React = require('react');

const courier = require('courier');

const Header = React.createClass({
    render() {

        const {currentDeck} = this.props;

        const deckName = currentDeck.get('name');
        const deckID = currentDeck.get('id');

        return (
            <div>
                <h4 className="m-y">
                    <span className="text-muted lead">{`#${deckID}`}</span>
                    {' '}
                    <span>{deckName}</span>
                </h4>
            </div>
        );
    }
});

module.exports = courier({

    component: Header,

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

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
