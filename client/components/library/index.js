const React = require('react');
const invariant = require('invariant');

const courier = require('courier');

const {types: ROUTES} = require('store/routes');
const {symbol: symbolPropType} = require('utils/proptype');

const Breadcrumb = require('./breadcrumb');
const Header = require('./header');
const Subnav = require('./subnav');
const LibraryDetail = require('./detail');
const CardReview = require('./cardreview');
const CardProfile = require('./cardprofile');

const Review = require('components/review');

const DumbLibrary = React.createClass({

    propTypes: {
        route: symbolPropType,
    },

    getComponents() {

        switch(this.props.route) {

        case ROUTES.LIBRARY.VIEW.ADD_DECK:
        case ROUTES.LIBRARY.VIEW.ADD_CARD:
        case ROUTES.LIBRARY.VIEW.CARDS:
        case ROUTES.LIBRARY.VIEW.DECKS:
        case ROUTES.LIBRARY.VIEW.DESCRIPTION:
        case ROUTES.LIBRARY.VIEW.META:

            return (
                <div>
                    <div className="row">
                        <div className="col-sm-12">
                            <Header />
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-sm-12 m-b">
                            <Subnav />
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-sm-12">
                            <LibraryDetail />
                        </div>
                    </div>
                </div>
            );

            break;

        case ROUTES.CARD.VIEW.FRONT:
        case ROUTES.CARD.VIEW.BACK:
        case ROUTES.CARD.VIEW.DESCRIPTION:
        case ROUTES.CARD.VIEW.META:
        case ROUTES.CARD.VIEW.STASHES:

            return (
                <div className="row">
                    <div className="col-sm-12">
                        <CardProfile />
                    </div>
                </div>
            );
            break;

        case ROUTES.CARD.REVIEW.VIEW.FRONT:
        case ROUTES.CARD.REVIEW.VIEW.BACK:
        case ROUTES.CARD.REVIEW.VIEW.DESCRIPTION:
        case ROUTES.CARD.REVIEW.VIEW.STASHES:
        case ROUTES.CARD.REVIEW.VIEW.META:

            return (
                <div className="row">
                    <div className="col-sm-12">
                        <CardReview />
                    </div>
                </div>
            );

            break;

        case ROUTES.REVIEW.VIEW.FRONT:
        case ROUTES.REVIEW.VIEW.BACK:
        case ROUTES.REVIEW.VIEW.DESCRIPTION:
        case ROUTES.REVIEW.VIEW.META:
        case ROUTES.REVIEW.VIEW.STASHES:

            return (
                <div className="row">
                    <div className="col-sm-12">
                        <Review />
                    </div>
                </div>
            );
            break;

        default:
            invariant(false, `Unexpected route. Given: ${String(this.props.route)}`);
        }

    },

    render() {
        return (
            <div>
                {this.getComponents()}
            </div>
        );
    }
});

const Library = courier({

    component: DumbLibrary,

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

const LibraryWrapper = React.createClass({

    render() {
        return (
            <div>
                <div className="row">
                    <div className="col-sm-12">
                        <Breadcrumb />
                    </div>
                </div>
                <Library />
            </div>
        );
    }
});

module.exports = LibraryWrapper;
