const React = require('react');
const Immutable = require('immutable');

const courier = require('courier');

const WaitingCardListItem = require('components/card/waitingcardlistitem');
const CardListItem = require('components/card/cardlistitem');

const WrappedCardListItem = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        stashID: React.PropTypes.number.isRequired,
        cardID: React.PropTypes.number.isRequired,
        card: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        path: React.PropTypes.array.isRequired,
        hasCard: React.PropTypes.bool.isRequired
    },

    onClick() {

        // invariant: card belongs to current deck

        const currentStashID = this.context.store.stashes.currentID();

        this.context.store.routes.toStashCard(this.props.cardID, currentStashID);
    },

    toggleRelationship() {

        const {stashID, cardID, hasCard} = this.props;

        this.context.store.stashes.toggleRelationship(stashID, cardID, !hasCard);
    },

    render() {

        const {card, cardID, path, hasCard} = this.props;

        // datetime of when last reviewed

        return (
            <CardListItem
                showButton
                hasCard={hasCard}
                cardID={cardID}
                card={card}
                path={path}
                onClick={this.onClick}
                onToggleButton={this.toggleRelationship}
            />
        );
    }

});

module.exports = courier({

    component: WrappedCardListItem,
    waitingComponent: WaitingCardListItem,

    onlyWaitingOnMount: true,

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        stashID: React.PropTypes.number.isRequired,
        cardID: React.PropTypes.number.isRequired
    },

    shouldRewatch(props) {

        const oldCardID = this.currentProps.cardID;
        const newCardID = props.cardID;

        return oldCardID != newCardID;
    },

    watch(props, manual, context) {

        const cardID = props.cardID;
        const stashID = props.stashID;

        return [
            context.store.cards.observable(cardID),
            context.store.stashes.watchStashCardRelationship(stashID, cardID)
        ];
    },

    assignNewProps: function(props, context) {

        const cardID = props.cardID;

        return context.store.cards.get(cardID)
            .then(function(card) {

                // get id of deck containing this card
                const deckID = card.get('deck');

                return context.store.decks.path(deckID)
                    .then(function(path) {

                        // invariant: path is array of resolved ancestors decks

                        const hasCard = context.store.stashes.stashHasCard(props.stashID, cardID);

                        return {
                            card: card,
                            path: path,
                            hasCard: hasCard
                        };

                    });
            });
    }
});
