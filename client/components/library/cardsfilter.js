const React = require('react');
const ReactDOM = require('react-dom');
const classnames = require('classnames');
const _ = require('lodash');
const Immutable = require('immutable');

const courier = require('courier');

const {pagination: cardPagination} = require('store/cards');

let labelMap = Immutable.Map();

labelMap = labelMap.setIn([cardPagination.sort.REVIEWED_AT, cardPagination.order.DESC], 'Recently Reviewed');
labelMap = labelMap.setIn([cardPagination.sort.REVIEWED_AT, cardPagination.order.ASC], 'Least Recently Reviewed');

labelMap = labelMap.setIn([cardPagination.sort.TIMES_REVIEWED, cardPagination.order.DESC], 'Most Frequently Reviewed');
labelMap = labelMap.setIn([cardPagination.sort.TIMES_REVIEWED, cardPagination.order.ASC], 'Least Frequently Reviewed');

labelMap = labelMap.setIn([cardPagination.sort.TITLE, cardPagination.order.DESC], 'Card Title Descending');
labelMap = labelMap.setIn([cardPagination.sort.TITLE, cardPagination.order.ASC], 'Card Title Ascending');

labelMap = labelMap.setIn([cardPagination.sort.CREATED_AT, cardPagination.order.DESC], 'Recently Created');
labelMap = labelMap.setIn([cardPagination.sort.CREATED_AT, cardPagination.order.ASC], 'Least Recently Created');

labelMap = labelMap.setIn([cardPagination.sort.UPDATED_AT, cardPagination.order.DESC], 'Recently Updated');
labelMap = labelMap.setIn([cardPagination.sort.UPDATED_AT, cardPagination.order.ASC], 'Least Recently Updated');

const list = [
    cardPagination.sort.REVIEWED_AT,
    cardPagination.sort.TIMES_REVIEWED,
    cardPagination.sort.UPDATED_AT,
    cardPagination.sort.TITLE,
    cardPagination.sort.CREATED_AT
];

const dropDownItemStyle = {
    fontSize: '.875rem'
};

const CardsFilter = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    getInitialState() {
        return {
            open: false
        };
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

    // notes: https://github.com/facebook/react/issues/579#issuecomment-60841923

    componentDidMount: function () {
        document.body.addEventListener('click', this.handleBodyClick);
    },

    componentWillUnmount: function () {
        document.body.removeEventListener('click', this.handleBodyClick);
    },

    handleBodyClick: function (event) {

        if(!this.state.open || event.target == ReactDOM.findDOMNode(this.refs.sortbutton)) {
            return;
        }

        this.setState({
            open: !this.state.open
        });
    },

    dropdownClickHandler: function(e) {
        event.preventDefault();
        event.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
    },

    onClickDropdown(event) {
        event.preventDefault();
        event.stopPropagation();

        this.setState({
            open: !this.state.open
        });
    },

    onClickSort(sort, order) {
        return (event) => {
            event.preventDefault();
            event.stopPropagation();

            this.context.store.cards.changeFilter(sort, order);
        };
    },

    getLabel() {
        const {sort, order} = this.props;

        return labelMap.getIn([sort, order]);
    },

    getListItems() {

        return _.reduce(list, function(buttons, sortKey, index) {


            let key = '';
            let label = labelMap.getIn([sortKey, cardPagination.order.DESC]);

            key = `${index}-0`;
            buttons.push(
                <a
                    key={key}
                    className="dropdown-item sortbutton"
                    href="#"
                    style={dropDownItemStyle}
                    onClick={this.onClickSort(sortKey, cardPagination.order.DESC)}
                >
                    {label}
                </a>
            );


            key = `${index}-1`;
            label = labelMap.getIn([sortKey, cardPagination.order.ASC]);
            buttons.push(
                <a
                    key={key}
                    className="dropdown-item sortbutton"
                    href="#"
                    style={dropDownItemStyle}
                    onClick={this.onClickSort(sortKey, cardPagination.order.ASC)}
                >
                    {label}
                </a>
            );

            return buttons;
        }, [], this);

    },

    render() {

        return (
            <div>
                <div className={classnames('dropdown', {open: this.state.open})}>
                    <button
                        ref="sortbutton"
                        className="btn btn-sm btn-secondary dropdown-toggle"
                        type="button"
                        id="dropdownMenu1"
                        data-toggle="dropdown"
                        aria-haspopup="true"
                        aria-expanded="false"

                        onClick={this.onClickDropdown}>
                        {`Sort by `}
                        <strong>
                            {this.getLabel()}
                        </strong>
                    </button>
                    <div className="dropdown-menu dropdown-menu-right">
                        {this.getListItems()}
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = courier({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    component: CardsFilter,

    watch(props, manual, context) {
        return [
            context.store.cards.watchOrder(),
            context.store.cards.watchSort()
        ];
    },

    assignNewProps: function(props, context) {

        return {
            order: context.store.cards.order(),
            sort: context.store.cards.sort()
        };

    }

});

