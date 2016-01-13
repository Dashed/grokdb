const React = require('react');
const ReactDOM = require('react-dom');
const classnames = require('classnames');
const _ = require('lodash');
const Immutable = require('immutable');

const courier = require('courier');

const {pagination: stashPagination} = require('store/stashes');

let labelMap = Immutable.Map();

labelMap = labelMap.setIn([stashPagination.sort.NAME, stashPagination.order.DESC], 'Name Descending');
labelMap = labelMap.setIn([stashPagination.sort.NAME, stashPagination.order.ASC], 'Name Ascending');

labelMap = labelMap.setIn([stashPagination.sort.CREATED_AT, stashPagination.order.DESC], 'Recently Created');
labelMap = labelMap.setIn([stashPagination.sort.CREATED_AT, stashPagination.order.ASC], 'Least Recently Created');

labelMap = labelMap.setIn([stashPagination.sort.UPDATED_AT, stashPagination.order.DESC], 'Recently Updated');
labelMap = labelMap.setIn([stashPagination.sort.UPDATED_AT, stashPagination.order.ASC], 'Least Recently Updated');

const list = [
    stashPagination.sort.UPDATED_AT,
    stashPagination.sort.NAME,
    stashPagination.sort.CREATED_AT
];

const dropDownItemStyle = {
    fontSize: '.875rem'
};

const StashesSort = React.createClass({

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
            stashPagination.sort.NAME,
            stashPagination.sort.CREATED_AT,
            stashPagination.sort.UPDATED_AT,
        ]),

        order: React.PropTypes.oneOf([
            stashPagination.order.DESC,
            stashPagination.order.ASC
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

            this.context.store.stashes.changeSort(sort, order);
        };
    },

    getLabel() {
        const {sort, order} = this.props;

        return labelMap.getIn([sort, order]);
    },

    getListItems() {

        return _.reduce(list, function(buttons, sortKey, index) {


            let key = '';
            let label = labelMap.getIn([sortKey, stashPagination.order.DESC]);

            key = `${index}-0`;
            buttons.push(
                <a
                    key={key}
                    className="dropdown-item sortbutton"
                    href="#"
                    style={dropDownItemStyle}
                    onClick={this.onClickSort(sortKey, stashPagination.order.DESC)}
                >
                    {label}
                </a>
            );


            key = `${index}-1`;
            label = labelMap.getIn([sortKey, stashPagination.order.ASC]);
            buttons.push(
                <a
                    key={key}
                    className="dropdown-item sortbutton"
                    href="#"
                    style={dropDownItemStyle}
                    onClick={this.onClickSort(sortKey, stashPagination.order.ASC)}
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

    component: StashesSort,

    watch(props, manual, context) {
        return [
            context.store.stashes.watchOrder(),
            context.store.stashes.watchSort()
        ];
    },

    assignNewProps: function(props, context) {

        return {
            order: context.store.stashes.order(),
            sort: context.store.stashes.sort()
        };

    }

});

