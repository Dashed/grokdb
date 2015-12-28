const React = require('react');
const invariant = require('invariant');

const courier = require('courier');

const {types: ROUTES} = require('store/routes');

const {symbol: symbolPropType} = require('utils/proptype');

const Breadcrumb = require('./breadcrumb');
const Header = require('./header');
const Subnav = require('./subnav');
const LibraryDetail = require('./detail');

const CardDetail = require('components/card/index.js');


const Library = React.createClass({

    propTypes: {
        route: symbolPropType,
    },

    getComponents() {

        switch(this.props.route) {

        case ROUTES.LIBRARY.VIEW.CARDS:
        case ROUTES.LIBRARY.VIEW.ADD_CARD:
        case ROUTES.LIBRARY.VIEW.DECKS:
        case ROUTES.LIBRARY.VIEW.ADD_DECK:
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
                        <div className="col-sm-12">
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
                        <CardDetail />
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
                <div className="row">
                    <div className="col-sm-12">
                        <Breadcrumb />
                    </div>
                </div>
                <div>
                    {this.getComponents()}
                </div>
            </div>
        );
    }
});

module.exports = courier({

    component: Library,

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
