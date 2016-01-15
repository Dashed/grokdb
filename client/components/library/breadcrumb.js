const React = require('react');

const courier = require('courier');

const Breadcrumb = require('components/deck/breadcrumb');
const BreadcrumbWaiting = require('components/deck/waitingbreadcrumb');

module.exports = courier({

    component: Breadcrumb,
    waitingComponent: BreadcrumbWaiting,

    onlyWaitingOnMount: true,

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    watch(props, manual, context) {
        return context.store.decks.watchCurrent();
    },

    assignNewProps: function(props, context) {

        const deckID = context.store.decks.currentID();

        return context.store.decks.path(deckID)
            .then(function(path) {
                return {
                    path: path,
                    toDeck: (newdeckID) => {
                        context.store.routes.toDeck(newdeckID, 1);
                    }
                };
            });
    }
});
