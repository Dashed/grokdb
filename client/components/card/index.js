const React = require('react');

const courier = require('courier');

const CardHeader = require('./header');

const CardDetail = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    backToCardsList(event) {
        event.preventDefault();
        event.stopPropagation();

        this.context.store.routes.toLibraryCards();
    },

    render() {
        return (
            <div>
                <div className="row">
                    <div className="col-sm-12 m-y">
                        <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={this.backToCardsList}
                        >{'Back to cards list'}</button>
                        <button
                            type="button"
                            className="btn btn-sm btn-success pull-right"
                            onClick={this.editCard}
                        >{'Edit'}</button>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <CardHeader />
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

    component: CardDetail,


});
