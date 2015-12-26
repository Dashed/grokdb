const React = require('react');
const invariant = require('invariant');
const classnames = require('classnames');

const courier = require('courier');

const {symbol} = require('utils/proptype');
const {types: ROUTES} = require('store/routes');

const Subnav = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        route: symbol.isRequired
    },

    switchView(routeID) {
        return (event) => {
            event.preventDefault();
            event.stopPropagation();

            switch(routeID) {
            case ROUTES.LIBRARY.VIEW.CARDS:
            case ROUTES.LIBRARY.VIEW.ADD_CARD:
                this.context.store.routes.toLibraryCards();
                break;

            case ROUTES.LIBRARY.VIEW.DECKS:
            case ROUTES.LIBRARY.VIEW.ADD_DECK:
                this.context.store.routes.toLibraryDecks();
                break;

            case ROUTES.LIBRARY.VIEW.DESCRIPTION:
                this.context.store.routes.toLibraryDescription();
                break;

            case ROUTES.LIBRARY.VIEW.META:
                this.context.store.routes.toLibraryMeta();
                break;

            default:
                invariant(false, `Invalid routeID. Given: ${routeID}`);
            }

        };

    },

    render() {

        const {route} = this.props;

        return (
            <ul className="nav nav-tabs m-b">
                <li className="nav-item">
                    <a
                        className={classnames('nav-link', {
                            'active': route == ROUTES.LIBRARY.VIEW.CARDS || route == ROUTES.LIBRARY.VIEW.ADD_CARD
                        })}
                        onClick={this.switchView(ROUTES.LIBRARY.VIEW.CARDS)}
                        href="#">
                        {'Cards'}
                    </a>
                </li>
                <li className="nav-item">
                    <a
                        className={classnames('nav-link', {
                            'active': route == ROUTES.LIBRARY.VIEW.DECKS || route == ROUTES.LIBRARY.VIEW.ADD_DECK
                        })}
                        onClick={this.switchView(ROUTES.LIBRARY.VIEW.DECKS)}
                        href="#">
                        {'Decks'}
                    </a>
                </li>
                <li className="nav-item">
                    <a
                        className={classnames('nav-link', {'active': route == ROUTES.LIBRARY.VIEW.DESCRIPTION})}
                        onClick={this.switchView(ROUTES.LIBRARY.VIEW.DESCRIPTION)}
                        href="#">
                        {'Description'}
                    </a>
                </li>
                <li className="nav-item">
                    <a
                        className={classnames('nav-link', {'active': route == ROUTES.LIBRARY.VIEW.META})}
                        onClick={this.switchView(ROUTES.LIBRARY.VIEW.META)}
                        href="#">
                        {'Meta'}
                    </a>
                </li>
            </ul>
        );
    }
});

const SubnavOrwell = courier({

    component: Subnav,

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

module.exports = SubnavOrwell;
