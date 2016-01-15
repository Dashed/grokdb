const React = require('react');
const Immutable = require('immutable');
const moment = require('moment');

const NAME_STYLE = {
    'overflowWrap': 'break-word',
    'wordWrap': 'break-word',
    'overflow': 'hidden'
};


const DeckListItem = React.createClass({

    propTypes: {
        deckID: React.PropTypes.number.isRequired,
        deck: React.PropTypes.instanceOf(Immutable.Map).isRequired,

        onClick: React.PropTypes.func.isRequired
    },

    onClick(event) {
        event.preventDefault();
        event.stopPropagation();

        this.props.onClick.call(void 0, this.props.deck);
    },

    render() {

        const {deck} = this.props;

        // datetime of when last reviewed

        const offset = new Date().getTimezoneOffset();
        const lastReviewedDatetime = moment.unix(deck.get('reviewed_at')).utcOffset(-offset);

        const wasReviewed = deck.get('has_reviewed');

        // TODO: remove/clean up
        // const createdAt = moment.unix(deck.get('created_at')).utcOffset(-offset);
        // const wasReviewed = Math.abs(lastReviewedDatetime.diff(createdAt)) <= 250 ? false : true;

        const lastReviewed = wasReviewed ? `last reviewed ${lastReviewedDatetime.fromNow()}.` : `hasn't been reviewed yet.`;

        const deckChildren = deck.get('children');
        const numDecks = deckChildren.size > 0 ?
            deckChildren.size == 1 ?
            'Has a deck.' : `Has ${deckChildren.size} decks.`
            : 'Has no decks.';

        return (
            <li className="list-group-item">
                <h6 className="list-group-item-heading m-y-0" style={NAME_STYLE}>
                    <a href="#" onClick={this.onClick} >
                        {deck.get('name')}
                    </a>
                </h6>
                <p className="list-group-item-text m-y-0">
                    <small className="text-muted">
                        {`Deck #${deck.get('id')} ${lastReviewed} ${numDecks}`}
                    </small>
                </p>
            </li>
        );
    }
});

module.exports = DeckListItem;
