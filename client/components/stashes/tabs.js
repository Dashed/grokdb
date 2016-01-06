const React = require('react');
const classnames = require('classnames');
const invariant = require('invariant');

const courier = require('courier');

const {symbol} = require('utils/proptype');
const {types: ROUTES} = require('store/routes');

const StashTabs = React.createClass({

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
            case ROUTES.STASHES.PROFILE.CARDS:
                this.context.store.routes.toStashCards();
                break;

            case ROUTES.STASHES.PROFILE.DESCRIPTION:
                this.context.store.routes.toStashDescription();
                break;

            case ROUTES.STASHES.PROFILE.META:
                this.context.store.routes.toStashMeta();
                break;

            default:
                invariant(false, `Invalid routeID. Given: ${routeID}`);
            }
        };
    },

    render() {

        const {route} = this.props;

        return (
            <ul className="nav nav-tabs">
                <li className="nav-item">
                    <a
                        className={classnames('nav-link', {
                            'active': route == ROUTES.STASHES.PROFILE.CARDS
                        })}
                        onClick={this.switchView(ROUTES.STASHES.PROFILE.CARDS)}
                        href="#">
                        {'Cards'}
                    </a>
                </li>
                <li className="nav-item">
                    <a
                        className={classnames('nav-link', {
                            'active': route == ROUTES.STASHES.PROFILE.DESCRIPTION
                        })}
                        onClick={this.switchView(ROUTES.STASHES.PROFILE.DESCRIPTION)}
                        href="#">
                        {'Description'}
                    </a>
                </li>
                <li className="nav-item">
                    <a
                        className={classnames('nav-link', {
                            'active': route == ROUTES.STASHES.PROFILE.META
                        })}
                        onClick={this.switchView(ROUTES.STASHES.PROFILE.META)}
                        href="#">
                        {'Meta'}
                    </a>
                </li>
            </ul>
        );
    }
});

module.exports = courier({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    component: StashTabs,

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
