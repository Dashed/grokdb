const React = require('react');

const courier = require('courier');
const {perPage} = require('constants/stashespagination');

const Pagination = require('components/pagination');

const StashesAllPagination = React.createClass({

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

    component: StashesAllPagination,

    onlyWaitingOnMount: true,

    watch(props, manual, context) {
        return context.store.stashes.watchPageAll();
    },

    assignNewProps: function(props, context) {

        return context.store.stashes.totalStashes()
            .then(function(totalStashes) {

                let currentPage = context.store.stashes.pageAll();

                const numOfPages = Math.ceil(totalStashes / perPage);

                if(currentPage > numOfPages) {
                    currentPage = numOfPages || 1;
                    context.store.stashes.pageAll(currentPage);
                }

                return {
                    numOfPages,
                    currentPage: currentPage
                };

            });

    }

});
