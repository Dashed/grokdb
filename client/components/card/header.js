const React = require('react');

const courier = require('courier');
const DumbCardHeader = require('./dumbheader');
const DumbWaitingCardHeader = require('./dumbwaitingheader');

module.exports = courier({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        cardID: React.PropTypes.number.isRequired
    },

    component: DumbCardHeader,
    waitingComponent: DumbWaitingCardHeader,

    onlyWaitingOnMount: true,

    watch(props, manual, context) {

        const {cardID} = props;

        return context.store.cards.observable(cardID);
    },

    assignNewProps: function(props, context) {

        const {cardID} = props;

        return context.store.cards.get(cardID)
            .then(function(currentCard) {

                return {
                    cardID: currentCard.get('id'),
                    cardTitle: currentCard.get('title')
                };
            });
    }
});
