const React = require('react');
const Immutable = require('immutable');
const _ = require('lodash');

const {pagination: cardPagination} = require('store/cards');
const SortDropDown = require('components/sortdropdown');

const listOrder = [
    ['Recently Reviewed', [cardPagination.sort.REVIEWED_AT, cardPagination.order.DESC]],
    ['Least Recently Reviewed', [cardPagination.sort.REVIEWED_AT, cardPagination.order.ASC]],
    ['Most Frequently Reviewed', [cardPagination.sort.TIMES_REVIEWED, cardPagination.order.DESC]],
    ['Least Frequently Reviewed', [cardPagination.sort.TIMES_REVIEWED, cardPagination.order.ASC]],
    ['Recently Updated', [cardPagination.sort.UPDATED_AT, cardPagination.order.DESC]],
    ['Least Recently Updated', [cardPagination.sort.UPDATED_AT, cardPagination.order.ASC]],
    ['Card Title Descending', [cardPagination.sort.TITLE, cardPagination.order.DESC]],
    ['Card Title Ascending', [cardPagination.sort.TITLE, cardPagination.order.ASC]],
    ['Recently Created', [cardPagination.sort.CREATED_AT, cardPagination.order.DESC]],
    ['Least Recently Created', [cardPagination.sort.CREATED_AT, cardPagination.order.ASC]]
];

const listOrderInverse = _.reduce(listOrder, (accumulator, [label, path]) => {
    return accumulator.setIn(path, label);
}, Immutable.Map());

const CardsSort = React.createClass({

    propTypes: {
        onClickSort: React.PropTypes.func.isRequired,

        sort: React.PropTypes.oneOf([
            cardPagination.sort.REVIEWED_AT,
            cardPagination.sort.TIMES_REVIEWED,
            cardPagination.sort.TITLE,
            cardPagination.sort.CREATED_AT,
            cardPagination.sort.UPDATED_AT,
        ]),

        order: React.PropTypes.oneOf([
            cardPagination.order.DESC,
            cardPagination.order.ASC
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

module.exports = CardsSort;
