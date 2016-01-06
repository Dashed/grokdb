const React = require('react');
const invariant = require('invariant');

const courier = require('courier');

const StashHeader = require('./header');
const StashTabs = require('./tabs');
const StashDescription = require('./description');
const StashMeta = require('./meta');
const StashCards = require('./cards');

const {types: ROUTES} = require('store/routes');

const StashDetail = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        stashID: React.PropTypes.number.isRequired,
        currentTab: React.PropTypes.oneOf(['Cards', 'Description', 'Meta'])
    },

    backToStashesList(event) {
        event.preventDefault();
        event.stopPropagation();

        this.context.store.routes.toStashes();
    },

    getChildComponent() {

        const {currentTab} = this.props;

        switch(currentTab) {

        case 'Cards':

            return (<StashCards />);

            break;

        case 'Description':

            return (<StashDescription />);
            break;

        case 'Meta':

            return (<StashMeta />);

            break;

        default:

            invariant(false, `Unexpected currentTab. Given: ${String(currentTab)}`);
        }

    },

    render() {

        const {stashID} = this.props;

        return (
            <div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={this.backToStashesList}
                        >{'Back to list of stashes'}</button>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <StashHeader stashID={stashID} />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <StashTabs />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        {this.getChildComponent()}
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

    component: StashDetail,

    assignNewProps: function(props, context) {

        const stashID = context.store.stashes.currentID();
        const route = context.store.routes.route();
        let currentTab;

        switch(route) {

        case ROUTES.STASHES.PROFILE.CARDS:

            currentTab = 'Cards';
            break;

        case ROUTES.STASHES.PROFILE.DESCRIPTION:

            currentTab = 'Description';
            break;

        case ROUTES.STASHES.PROFILE.META:

            currentTab = 'Meta';
            break;

        default:
            invariant(false, `Unexpected route. Given: ${String(route)}`);
        }

        return {
            stashID,
            currentTab
        };
    }
});
