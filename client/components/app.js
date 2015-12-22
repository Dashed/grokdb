const React = require('react');


const App = React.createClass({

    render() {
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
                        {'hello'}
                    </div>
                </div>
            </div>
        );
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
