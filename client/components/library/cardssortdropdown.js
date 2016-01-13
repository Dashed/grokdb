const React = require('react');
const Immutable = require('immutable');
const _ = require('lodash');

const courier = require('courier');

const {pagination: cardPagination} = require('store/cards');
const SortDropDown = require('components/sortdropdown');

const listOrder = [
    ['Recently Reviewed', [cardPagination.sort.REVIEWED_AT, cardPagination.order.DESC]],
    ['Least Recently Reviewed', [cardPagination.sort.REVIEWED_AT, cardPagination.order.ASC]],
    ['Most Frequently Reviewed', [cardPagination.sort.TIMES_REVIEWED, cardPagination.order.DESC]],
    ['Least Frequently Reviewed', [cardPagination.sort.TIMES_REVIEWED, cardPagination.order.ASC]],
    ['Card Title Descending', [cardPagination.sort.TITLE, cardPagination.order.DESC]],
    ['Card Title Ascending', [cardPagination.sort.TITLE, cardPagination.order.ASC]],
    ['Recently Created', [cardPagination.sort.CREATED_AT, cardPagination.order.DESC]],
    ['Least Recently Created', [cardPagination.sort.CREATED_AT, cardPagination.order.ASC]],
    ['Recently Updated', [cardPagination.sort.UPDATED_AT, cardPagination.order.DESC]],
    ['Least Recently Updated', [cardPagination.sort.UPDATED_AT, cardPagination.order.ASC]]
];

const listOrderInverse = _.reduce(listOrder, (accumulator, [label, path]) => {
    return accumulator.setIn(path, label);
}, Immutable.Map());

const CardsSort = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        currentLabel: React.PropTypes.string.isRequired,
        listOrder: React.PropTypes.array.isRequired
    },

    dropdownClickHandler: function(e) {
        event.preventDefault();
        event.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
    },

    onClickSort([sort, order]) {
        this.context.store.cards.changeFilter(sort, order);
    },

    render() {

        return (
            <div>
                <SortDropDown
                    listOrder={this.props.listOrder}
                    currentLabel={this.props.currentLabel}
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

    component: CardsSort,

    watch(props, manual, context) {
        return [
            context.store.cards.watchOrder(),
            context.store.cards.watchSort()
        ];
    },

    assignNewProps: function(props, context) {

        const path = [context.store.cards.sort(), context.store.cards.order()];

        return {
            currentLabel: listOrderInverse.getIn(path),
            listOrder: listOrder
        };
    }

});

