const React = require('react');

const courier = require('courier');

const NAME_STYLE = {
    'overflowWrap': 'break-word',
    'wordWrap': 'break-word'
};

const DumbStashHeader = React.createClass({

    propTypes: {
        isReviewing: React.PropTypes.bool,
        stashName: React.PropTypes.string.isRequired,
        stashID: React.PropTypes.number.isRequired
    },

    getDefaultProps() {

        return {
            isReviewing: false
        };
    },

    getLead() {

        const {stashID, isReviewing} = this.props;

        if(isReviewing) {
            return `Reviewing Stash #${stashID}`;
        }

        return `Stash #${stashID}`;

    },

    render() {

        const {stashName} = this.props;

        return (
            <div>
                <h4 className="m-y-0" style={NAME_STYLE}>
                    <span className="text-muted lead">
                        {this.getLead()}
                    </span>
                    {' '}
                    <span>{stashName}</span>
                </h4>
            </div>
        );
    }
});


const WAITING_STYLE = {
    color: '#ffffff'
};

const DumbWaitingStashHeader = React.createClass({

    render() {

        return (
            <div>
                <h4 className="m-y-0">
                    <span className="text-muted lead">{`Stash #`}</span>
                    {' '}
                    <span style={WAITING_STYLE}>{'loading'}</span>
                </h4>
            </div>
        );
    }
});

module.exports = courier({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        stashID: React.PropTypes.number.isRequired
    },

    component: DumbStashHeader,
    waitingComponent: DumbWaitingStashHeader,

    onlyWaitingOnMount: true,

    watch(props, manual, context) {

        const {stashID} = props;

        return context.store.stashes.observable(stashID);
    },

    assignNewProps: function(props, context) {

        const {stashID} = props;

        return context.store.stashes.get(stashID)
            .then(function(currentStash) {

                return {
                    stashID: currentStash.get('id'),
                    stashName: currentStash.get('name')
                };
            });
    }
});
