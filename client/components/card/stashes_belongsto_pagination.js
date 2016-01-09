const React = require('react');

const courier = require('courier');
const {perPage} = require('constants/stashespagination');

const Pagination = require('components/pagination');

const StashesBelongsToPagination = React.createClass({

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

    propTypes: {
        cardID: React.PropTypes.number.isRequired
    },

    component: StashesBelongsToPagination,

    onlyWaitingOnMount: true,

    watch(props, manual, context) {
        return context.store.stashes.watchPageOfCardBelongsTo();
    },

    assignNewProps: function(props, context) {

        return context.store.stashes.totalStashesByCard(props.cardID)
            .then(function(totalStashes) {

                let currentPage = context.store.stashes.pageOfCardBelongsTo();

                const numOfPages = Math.ceil(totalStashes / perPage);

                if(currentPage > numOfPages) {
                    currentPage = numOfPages;
                    context.store.stashes.pageOfCardBelongsTo(currentPage);
                }

                return {
                    numOfPages,
                    currentPage: currentPage
                };

            });

    }

});
