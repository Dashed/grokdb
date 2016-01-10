const React = require('react');
const Immutable = require('immutable');

const courier = require('courier');

const WaitingCardListItem = require('components/card/waitingcardlistitem');
const CardListItem = require('components/card/cardlistitem');

const WrappedCardListItem = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        cardID: React.PropTypes.number.isRequired,
        card: React.PropTypes.instanceOf(Immutable.Map).isRequired
    },

    onClick() {

        // invariant: card belongs to current deck

        const currentStashID = this.context.store.stashes.currentID();

        console.log('change');
        // this.context.store.routes.toCard(this.props.cardID, currentDeckID);
    },

    render() {

        const {card, cardID} = this.props;

        // datetime of when last reviewed

        return (
            <CardListItem
                cardID={cardID}
                card={card}
                onClick={this.onClick}
            />
        );
    }

});

module.exports = courier({

    component: WrappedCardListItem,
    waitingComponent: WaitingCardListItem,

    onlyWaitingOnMount: true,

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        cardID: React.PropTypes.number.isRequired
    },

    shouldRewatch(props) {

        const oldCardID = this.currentProps.cardID;
        const newCardID = props.cardID;

        return oldCardID != newCardID;
    },

    watch(props, manual, context) {

        const cardID = props.cardID;

        return context.store.cards.observable(cardID);
    },

    assignNewProps: function(props, context) {

        const cardID = props.cardID;

        return context.store.cards.get(cardID)
            .then(function(card) {
                return {
                    card: card
                };
            });
    }
});
