const React = require('react');
const invariant = require('invariant');

const orwell = require('orwell');

const Library = require('./library');
const {types: ROUTES} = require('store/routes');

const AppRouteHandler = React.createClass({

    propTypes: {
        RouteHandler: React.PropTypes.oneOfType([ React.PropTypes.func, React.PropTypes.string ])
    },

    render() {

        const {RouteHandler} = this.props;

        return (
            <div key="app">
                <div className="row">
                    <div className="col-sm-12">
                        <header>
                            <h1 className="display-4 m-y">grokdb</h1>
                        </header>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <ul className="nav nav-pills">
                            <li className="nav-item">
                                <a className="nav-link active" href="#">
                                    {'Library'}
                                </a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="#">
                                    {'Stashes'}
                                </a>
                            </li>
                            <li className="nav-item pull-right">
                                <a className="nav-link" href="#">
                                    {'Settings'}
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <RouteHandler />
                    </div>
                </div>
            </div>
        );
    }
});

const App = orwell(AppRouteHandler, {

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    watch(props, manual, context) {
        return context.store.routes.watchRoute();
    },

    assignNewProps(props, context) {

        const route = context.store.routes.route();

        let handler;

        switch(route) {

        case ROUTES.DECK.VIEW.CARDS:
        case ROUTES.DECK.VIEW.DECKS:
            handler = Library;
            break;

        default:
            invariant(false, `Unexpected route. Given: ${String(route)}`);
        }

        return {
            RouteHandler: handler
        };
    }
});


// container for everything
const AppContainer = React.createClass({
    render() {
        return (
            <div className="container">
                <App {...this.props} />
                <hr className="m-t-lg"/>
                <footer className="m-b row">
                    <div className="col-sm-6">
                        <a href="https://github.com/dashed/grokdb/issues" target="_blank">{'Bugs? Issues? Ideas?'}</a>
                    </div>
                    <div className="col-sm-6">
                        <div className="btn-group p-b pull-right" role="group" aria-label="Basic example">
                            <button
                                type="button"
                                className="btn btn-warning"
                            >
                                {"Backup database"}
                            </button>
                        </div>
                    </div>
                </footer>
            </div>
        );
    }
});

module.exports = AppContainer;
