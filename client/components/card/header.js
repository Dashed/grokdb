const React = require('react');

const courier = require('courier');
const DumbCardHeader = require('./dumbheader');
const DumbWaitingCardHeader = require('./dumbwaitingheader');

module.exports = courier({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    component: DumbCardHeader,
    waitingComponent: DumbWaitingCardHeader,

    onlyWaitingOnMount: true,

    watch(props, manual, context) {
        return context.store.cards.watchCurrent();
    },

    assignNewProps: function(props, context) {

        return context.store.cards.current()
            .then(function(currentCard) {

                return {
                    cardID: currentCard.get('id'),
                    cardTitle: currentCard.get('title')
                };
            });
    }
});
