const React = require('react');

const StashDetail = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    backToStashesList(event) {
        event.preventDefault();
        event.stopPropagation();

        this.context.store.routes.toStashes();
    },

    render() {
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
            </div>
        );
    }
});

module.exports = StashDetail;
