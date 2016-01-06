const React = require('react');

const courier = require('courier');

const StashHeader = require('./header');
const StashTabs = require('./tabs');

const StashDetail = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        stashID: React.PropTypes.number.isRequired
    },

    backToStashesList(event) {
        event.preventDefault();
        event.stopPropagation();

        this.context.store.routes.toStashes();
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

        return {
            stashID
        };
    }
});
