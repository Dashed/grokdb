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
                <h4 className="m-y">
                    <span className="text-muted lead">{`Card #`}</span>
                    {' '}
                    <span>{' '}</span>
                </h4>
            </div>
        );
    }
});

module.exports = courier({

    component: CardHeader,
    waitingComponent: WaitingCardHeader,

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

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
