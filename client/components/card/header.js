const React = require('react');

const courier = require('courier');
const DumbCardHeader = require('./dumbheader');

const WaitingCardHeader = React.createClass({

    render() {

        return (
            <div>
                <h4>
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

    component: DumbCardHeader,
    waitingComponent: WaitingCardHeader,

    onlyWaitingOnMount: true,

    watch(props, manual, context) {
        return context.store.cards.watchCurrent();
    },

    assignNewProps: function(props, context) {

        return context.store.cards.current()
            .then(function(currentCard) {

                return {
                    cardID: currentCard.get('id'),
                    cardTitle: currentCard.get('title')
                };
            });
    }
});
