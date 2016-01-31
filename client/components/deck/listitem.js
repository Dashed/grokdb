const React = require('react');
const Immutable = require('immutable');
const moment = require('moment');

const NAME_STYLE = {
    'overflowWrap': 'break-word',
    'wordWrap': 'break-word',
    'overflow': 'hidden'
};

// http://stackoverflow.com/questions/10182336/text-cropping-when-using-overflow-hidden
const LINK_STYLE = {
    'lineHeight': 1.3
};

const DeckListItem = React.createClass({

    propTypes: {
        deckID: React.PropTypes.number.isRequired,
        deck: React.PropTypes.instanceOf(Immutable.Map).isRequired,

        onClick: React.PropTypes.func.isRequired,

        // cosmetic flags
        showSideButton: React.PropTypes.bool.isRequired,
        onClickSideButton: React.PropTypes.func.isRequired,
        sideButtonLabel: React.PropTypes.string.isRequired
    },

    getDefaultProps() {

        return {
            showSideButton: false,
            onClickSideButton: () => void 0,
            sideButtonLabel: ''
        };
    },

    onClick(event) {
        event.preventDefault();
        event.stopPropagation();

        this.props.onClick.call(void 0, this.props.deck);
    },

    onClickSideButton(event) {
        event.preventDefault();
        event.stopPropagation();

        this.props.onClickSideButton.call(void 0);
    },

    getButton() {

        if(!this.props.showSideButton) {
            return null;
        }

        return (
            <button
                type="button"
                onClick={this.onClickSideButton}
                className="btn btn-sm pull-right btn-danger">
                { this.props.sideButtonLabel }
            </button>
        );

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
                {this.getButton()}
                <h6 className="list-group-item-heading m-y-0" style={NAME_STYLE}>
                    <a href="#" onClick={this.onClick} style={LINK_STYLE} >
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
