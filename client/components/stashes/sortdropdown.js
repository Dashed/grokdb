const React = require('react');
const Immutable = require('immutable');
const _ = require('lodash');

const {pagination: stashPagination} = require('store/stashes');
const SortDropDown = require('components/sortdropdown');

const listOrder = [
    ['Name Descending', [stashPagination.sort.NAME, stashPagination.order.DESC]],
    ['Name Ascending', [stashPagination.sort.NAME, stashPagination.order.ASC]],
    ['Recently Created', [stashPagination.sort.CREATED_AT, stashPagination.order.DESC]],
    ['Least Recently Created', [stashPagination.sort.CREATED_AT, stashPagination.order.ASC]],
    ['Recently Updated', [stashPagination.sort.UPDATED_AT, stashPagination.order.DESC]],
    ['Least Recently Updated', [stashPagination.sort.UPDATED_AT, stashPagination.order.ASC]]
];

const listOrderInverse = _.reduce(listOrder, (accumulator, [label, path]) => {
    return accumulator.setIn(path, label);
}, Immutable.Map());

const StashesSort = React.createClass({

    propTypes: {
        onClickSort: React.PropTypes.func.isRequired,

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

    onClickSort([sort, order]) {
        this.props.onClickSort.call(void 0, sort, order);
    },

    render() {

        const path = [this.props.sort, this.props.order];
        const label = listOrderInverse.getIn(path);
        return (
            <div>
                <SortDropDown
                    listOrder={listOrder}
                    currentLabel={label}
                    onClickSort={this.onClickSort}
                />
            </div>
        );
    }
});

module.exports = StashesSort;
