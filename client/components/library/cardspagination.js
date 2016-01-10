const React = require('react');

const courier = require('courier');
const {perPage} = require('constants/cardspagination');

const Pagination = require('components/pagination');

const CardsPagination = React.createClass({

    propTypes: {
        numOfPages: React.PropTypes.number.isRequired,
        currentPage: React.PropTypes.number.isRequired,

        onClickCurrent: React.PropTypes.func,
        onClickPage: React.PropTypes.func.isRequired
    },

    render() {

        if(this.props.numOfPages > 1) {
            return (<Pagination {...this.props} />);
        }

        return null;
    }
});

module.exports = courier({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    component: CardsPagination,

    onlyWaitingOnMount: true,

    // TODO: optimization opportunity

    watch(props, manual, context) {
        return [
            context.store.decks.watchCurrentID(),
            context.store.cards.watchPage()
        ];
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
