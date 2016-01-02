const React = require('react');

const courier = require('courier');
const {perPage} = require('constants/cardspagination');

const Pagination = require('components/pagination');

module.exports = courier({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    component: Pagination,

    onlyWaitingOnMount: true,

    watch(props, manual, context) {
        return context.store.cards.watchPage();
    },

    assignNewProps: function(props, context) {

        const deckID = context.store.decks.currentID();

        return context.store.cards.totalCards(deckID)
            .then(function(totalCards) {

                const currentPage = context.store.cards.page();

                return {
                    numOfPages: Math.ceil(totalCards / perPage),
                    currentPage: currentPage
                };

            });

    }

});
