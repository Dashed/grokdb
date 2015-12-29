const React = require('react');
const Immutable = require('immutable');

const courier = require('courier');

const CardHeader = React.createClass({

    propTypes: {
        currentCard: React.PropTypes.instanceOf(Immutable.Map).isRequired
    },

    render() {

        const {currentCard} = this.props;

        const cardTitle = currentCard.get('title');
        const cardID = currentCard.get('id');

        return (
            <div>
                <h4 className="m-b">
                    <span className="text-muted lead">{`Card #${cardID}`}</span>
                    {' '}
                    <span>{cardTitle}</span>
                </h4>
            </div>
        );
    }
});

const WaitingCardHeader = React.createClass({

    render() {

        return (
            <div>
                <h4 className="m-b">
                    <span className="text-muted lead">{`Card #`}</span>
                    {' '}
                    <span style={{color: '#ffffff'}}>{'loading'}</span>
                </h4>
            </div>
        );
    }
});

module.exports = courier({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    component: CardHeader,
    waitingComponent: WaitingCardHeader,

    onlyWaitingOnMount: true,

    watch(props, manual, context) {
        return context.store.cards.watchCurrent();
    },

    assignNewProps: function(props, context) {

        return context.store.cards.current()
            .then(function(currentCard) {

                return {
                    currentCard: currentCard
                };
            });
    }
});
