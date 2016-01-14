const React = require('react');
const classnames = require('classnames');

const courier = require('courier');

const StashesAll = require('./stashes_all');
const StashesBelongsTo = require('./stashes_belongsto');

const {pagination: stashPagination} = require('store/stashes');
const StashesSortDropDown = require('components/stashes/sortdropdown');

const generateButtonStyle = function(truth) {
    return {
        'btn-primary': truth,
        'btn-primary-outline': !truth,
        'disabled': truth
    };
};

const __StashesSortBelongsTo = React.createClass({

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
        this.context.store.stashes.sortOfCardBelongsTo(sort);
        this.context.store.stashes.orderOfCardBelongsTo(order);
        this.context.store.commit();
    },

    render() {

        return (
            <StashesSortDropDown
                order={this.props.order}
                sort={this.props.sort}
                onClickSort={this.onClickSort}
            />
        );
    }
});

const StashesSortBelongsTo = courier({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    component: __StashesSortBelongsTo,

    watch(props, manual, context) {
        return [
            context.store.stashes.watchOrderOfCardBelongsTo(),
            context.store.stashes.watchSortOfCardBelongsTo()
        ];
    },

    assignNewProps: function(props, context) {

        return {
            sort: context.store.stashes.sortOfCardBelongsTo(),
            order: context.store.stashes.orderOfCardBelongsTo()
        };
    }

});

const __StashesSortAll = React.createClass({

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
        this.context.store.stashes.sortOfCardAll(sort);
        this.context.store.stashes.orderOfCardAll(order);
        this.context.store.commit();
    },

    render() {

        return (
            <StashesSortDropDown
                order={this.props.order}
                sort={this.props.sort}
                onClickSort={this.onClickSort}
            />
        );
    }
});

const StashesSortAll = courier({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    component: __StashesSortAll,

    watch(props, manual, context) {
        return [
            context.store.stashes.watchOrderOfCardAll(),
            context.store.stashes.watchSortOfCardAll()
        ];
    },

    assignNewProps: function(props, context) {

        return {
            sort: context.store.stashes.sortOfCardAll(),
            order: context.store.stashes.orderOfCardAll()
        };
    }

});


const CardStashes = React.createClass({

    propTypes: {
        cardID: React.PropTypes.number.isRequired
    },

    getInitialState() {

        return {
            view: 'belongs_to'
        };

    },

    onSwitchTab(tabType) {

        return (event) => {
            event.preventDefault();
            event.stopPropagation();

            if(this.state.view == tabType) {
                return;
            }

            this.setState({
                view: tabType
            });
        };

    },

    getListComponent() {

        switch(this.state.view) {

        case 'belongs_to':

            return <StashesBelongsTo cardID={this.props.cardID} />;

            break;

        case 'all':

            return <StashesAll cardID={this.props.cardID} />;

            break;

        default:

            throw Error(`Unexpected view. Given ${this.state.view}`);
        }

    },

    getDropdownSort() {

        switch(this.state.view) {

        case 'belongs_to':

            return (
                <StashesSortBelongsTo />
            );

            break;

        case 'all':

            return (
                <StashesSortAll />
            );

            break;

        default:

            throw Error(`Unexpected view. Given ${this.state.view}`);
        }

    },

    render() {

        const {view} = this.state;

        return (
            <div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <button
                            type="button"
                            className={classnames('btn-sm', 'btn', generateButtonStyle(view == 'belongs_to'))}
                            onClick={this.onSwitchTab('belongs_to')}
                        >
                            {'Belongs to'}
                        </button>
                        {' '}
                        <button
                            type="button"
                            className={classnames('btn-sm', 'btn', generateButtonStyle(view == 'all'))}
                            onClick={this.onSwitchTab('all')}
                        >
                            {'All'}
                        </button>
                        <div className="pull-right">
                            {this.getDropdownSort()}
                        </div>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        {this.getListComponent()}
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = CardStashes;
