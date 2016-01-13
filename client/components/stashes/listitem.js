const React = require('react');
const Immutable = require('immutable');

const courier = require('courier');

const NAME_STYLE = {
    'overflowWrap': 'break-word',
    'wordWrap': 'break-word'
};

const StashListItem = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        stashID: React.PropTypes.number.isRequired,
        stash: React.PropTypes.instanceOf(Immutable.Map).isRequired
    },

    onClick(event) {
        event.preventDefault();
        event.stopPropagation();

        this.context.store.routes.toStash(this.props.stashID);
    },

    render() {

        const {stash} = this.props;

        return (
            <li className="list-group-item">
                <h6 className="list-group-item-heading m-y-0" style={NAME_STYLE}>
                    <a href="#" onClick={this.onClick} >
                        {stash.get('name')}
                    </a>
                </h6>
                <p className="list-group-item-text m-y-0">
                    <small className="text-muted">
                        {`Stash #${stash.get('id')}`}
                    </small>
                </p>
            </li>
        );
    }
});

module.exports = courier({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    component: StashListItem,
    // waitingComponent: WaitingCardListItem,

    onlyWaitingOnMount: true,

    propTypes: {
        stashID: React.PropTypes.number.isRequired
    },

    shouldRewatch(props) {

        const oldStashID = this.currentProps.stashID;
        const newStashID = props.stashID;

        return oldStashID != newStashID;
    },

    watch(props, manual, context) {

        const stashID = props.stashID;

        return context.store.stashes.observable(stashID);
    },

    assignNewProps: function(props, context) {

        const stashID = props.stashID;

        return context.store.stashes.get(stashID)
            .then(function(stash) {
                return {
                    stash: stash
                };
            });
    }
});
