const React = require('react');
const Immutable = require('immutable');
const moment = require('moment');
const _ = require('lodash');

const courier = require('courier');

const NAME_STYLE = {
    'overflowWrap': 'break-word',
    'wordWrap': 'break-word',
    'overflow': 'hidden'
};

const CardListItem = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        currentDeckID: React.PropTypes.number.isRequired,
        cardID: React.PropTypes.number.isRequired,
        card: React.PropTypes.instanceOf(Immutable.Map).isRequired,

        // deck path of card
        path: React.PropTypes.array.isRequired,

        onClick: React.PropTypes.func.isRequired
    },

    onClick(event) {
        event.preventDefault();
        event.stopPropagation();

        this.props.onClick.call(void 0);

    },

    toDeck(deckID) {

        return (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.context.store.routes.toDeck(deckID, 1);
        };
    },

    getDeckPath() {

        const {path, currentDeckID} = this.props;

        const crumbs = _.reduce(path, (accumulator, deck) => {

            accumulator.push(
                <span key={`sep-${accumulator.length}`}>
                    {'/ '}
                </span>
            );

            const deckID = deck.get('id');

            if(deckID == currentDeckID) {

                accumulator.push(
                    <span key={`crumb-${deckID}-${accumulator.length}`}>
                        {deck.get('name')}
                        {' '}
                    </span>
                );

            } else {

                accumulator.push(
                    <span key={`crumb-${deckID}-${accumulator.length}`}>
                        <a
                            href="#"
                            onClick={this.toDeck(deckID)}
                            >
                            {deck.get('name')}
                        </a>
                        {' '}
                    </span>
                );
            }



            return accumulator;
        }, []);

        return (
            <small className="text-muted" style={NAME_STYLE}>
                {'Deck path: '}
                {crumbs}
            </small>
        );

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
                <h6 className="list-group-item-heading m-y-0" style={NAME_STYLE}>
                    <a href="#" onClick={this.onClick} >
                        {card.get('title')}
                    </a>
                </h6>
                <p className="list-group-item-text m-y-0">
                    <small className="text-muted">
                        {`Card #${card.get('id')} ${lastReviewed} ${extraSummary} ${score}`}
                    </small>
                    <br/>
                    {this.getDeckPath()}
                </p>
            </li>
        );
    }

});

module.exports = courier({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    component: CardListItem,

    onlyWaitingOnMount: true,

    watch(props, manual, context) {
        return [
            context.store.decks.watchCurrentID()
        ];
    },

    assignNewProps: function(props, context) {

        return {
            currentDeckID: context.store.decks.currentID()
        };
    }

});
