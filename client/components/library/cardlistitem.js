const React = require('react');
const Immutable = require('immutable');
const moment = require('moment');

const courier = require('courier');

const WaitingCardListItem = require('./waitingcardlistitem');

const CardListItem = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        cardID: React.PropTypes.number.isRequired,
        card: React.PropTypes.instanceOf(Immutable.Map).isRequired
    },

    onClick(event) {
        event.preventDefault();
        event.stopPropagation();

        // invariant: card belongs to current deck

        const currentDeckID = this.context.store.decks.currentID();

        this.context.store.routes.toCard(this.props.cardID, currentDeckID);
    },

    render() {

        const {card} = this.props;

        // datetime of when last reviewed

        const offset = new Date().getTimezoneOffset();
        const lastReviewedDatetime = moment.unix(card.getIn(['review_stat', 'reviewed_at'])).utcOffset(-offset);

        const createdAt = moment.unix(card.get('created_at')).utcOffset(-offset);
        const wasReviewed = Math.abs(lastReviewedDatetime.diff(createdAt)) <= 250 ? false : true;

        const lastReviewed = wasReviewed ? `last reviewed ${lastReviewedDatetime.fromNow()}.` : `hasn't been reviewed yet.`;

        const extraSummary = wasReviewed ? `Reviewed ${card.getIn(['review_stat', 'times_reviewed'])} times.` : '';

        // TODO: get score
        const score = `Performance score of ${100-card.getIn(['review_stat', 'score']).toPrecision(5)*100}%`;

        return (
            <li className="list-group-item">
                <h6 className="list-group-item-heading m-y-0">
                    <a href="#" onClick={this.onClick} >
                        {card.get('title')}
                    </a>
                </h6>
                <p className="list-group-item-text m-y-0">
                    <small className="text-muted">
                        {`Card #${card.get('id')} ${lastReviewed} ${extraSummary} ${score}`}
                    </small>
                    <br/>
                    <small>
                        {'deck path'}
                    </small>
                </p>
            </li>
        );
    }

});

module.exports = courier({

    component: CardListItem,
    waitingComponent: WaitingCardListItem,

    onlyWaitingOnMount: true,

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    shouldRewatch(props) {

        const oldCardID = this.currentProps.cardID;
        const newCardID = props.cardID;

        return oldCardID != newCardID;
    },

    watch(props, manual, context) {

        const cardID = props.cardID;

        return context.store.cards.observable(cardID);
    },

    assignNewProps: function(props, context) {

        const cardID = props.cardID;

        return context.store.cards.get(cardID)
            .then(function(card) {
                return {
                    card: card
                };
            });
    }
});
