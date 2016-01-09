const React = require('react');
const invariant = require('invariant');

const courier = require('courier');

const {types: ROUTES} = require('store/routes');
const {symbol: symbolPropType} = require('utils/proptype');

const CreateStash = require('./create');
const StashesList = require('./list');
const StashDetail = require('./detail');
const StashesPagination = require('./pagination');

const Stashes = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        route: symbolPropType,
    },

    toNewStash(event) {
        event.preventDefault();
        event.stopPropagation();

        this.context.store.routes.toAddNewStash();
    },

    onClickPage(requestedPageNum) {
        return this.context.store.routes.toStashesPage(requestedPageNum);
    },

    render() {

        switch(this.props.route) {

        case ROUTES.STASHES.VIEW.LIST:

            return (
                <div key="stashes">
                    <div className="row m-b">
                        <div className="col-sm-12">
                            <div className="btn-group btn-group-sm" role="group">
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={this.toNewStash}
                                >{'New Stash'}</button>
                            </div>
                        </div>
                    </div>
                    <div className="row m-b">
                        <div className="col-sm-12">
                            <StashesList />
                        </div>
                    </div>
                    <div className="row m-b">
                        <div className="col-sm-12">
                            <StashesPagination
                                onClickPage={this.onClickPage}
                            />
                        </div>
                    </div>
                </div>
            );

            break;

        case ROUTES.STASHES.VIEW.ADD:

            return (
                <CreateStash />
            );
            break;

        case ROUTES.STASHES.PROFILE.CARDS:
        case ROUTES.STASHES.PROFILE.DESCRIPTION:
        case ROUTES.STASHES.PROFILE.META:
            return (
                <StashDetail />
            );
            break;

        // case ROUTES.STASHES.REVIEW.VIEW.FRONT:
        // case ROUTES.STASHES.REVIEW.VIEW.BACK:
        // case ROUTES.STASHES.REVIEW.VIEW.DESCRIPTION:
        // case ROUTES.STASHES.REVIEW.VIEW.META:
        // case ROUTES.STASHES.REVIEW.VIEW.STASHES:

        //     return null;
        //     break;

        default:
            invariant(false, `Unexpected route. Given: ${String(this.props.route)}`);

        }


    }
});

module.exports = courier({

    component: Stashes,

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    watch(props, manual, context) {
        return context.store.routes.watchRoute();
    },

    assignNewProps(props, context) {

        const route = context.store.routes.route();

        return {
            route: route
        };

    }
});
