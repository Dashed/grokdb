const React = require('react');

const courier = require('courier');

const {pagination: stashPagination} = require('store/stashes');
const StashesSortDropDown = require('components/stashes/sortdropdown');

const StashesSort = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        sort: React.PropTypes.oneOf([
            stashPagination.sort.NAME,
            stashPagination.sort.CREATED_AT,
            stashPagination.sort.UPDATED_AT
        ]),

        order: React.PropTypes.oneOf([
            stashPagination.order.DESC,
            stashPagination.order.ASC
        ])
    },

    onClickSort(sort, order) {
        this.context.store.stashes.changeSort(sort, order);
    },

    render() {

        return (
            <div>
                <StashesSortDropDown
                    order={this.props.order}
                    sort={this.props.sort}
                    onClickSort={this.onClickSort}
                />
            </div>
        );
    }
});

module.exports = courier({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    component: StashesSort,

    watch(props, manual, context) {
        return [
            context.store.stashes.watchOrder(),
            context.store.stashes.watchSort()
        ];
    },

    assignNewProps: function(props, context) {

        return {
            sort: context.store.stashes.sort(),
            order: context.store.stashes.order()
        };
    }

});
