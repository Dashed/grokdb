const React = require('react');

const courier = require('courier');

const {pagination: cardPagination} = require('store/cards');
const CardsSortDropDown = require('components/card/sortdropdown');

const CardsSort = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
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

    onClickSort(sort, order) {
        this.context.store.cards.changeSort(sort, order);
    },

    render() {

        return (
            <div>
                <CardsSortDropDown
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

    component: CardsSort,

    watch(props, manual, context) {
        return [
            context.store.cards.watchOrder(),
            context.store.cards.watchSort()
        ];
    },

    assignNewProps: function(props, context) {

        return {
            sort: context.store.cards.sort(),
            order: context.store.cards.order()
        };
    }

});
