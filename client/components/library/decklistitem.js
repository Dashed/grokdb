const React = require('react');
const Immutable = require('immutable');
const moment = require('moment');

const courier = require('courier');

const DeckListItem = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        deckID: React.PropTypes.number.isRequired,
        deck: React.PropTypes.instanceOf(Immutable.Map).isRequired
    },

    onClick(event) {
        event.preventDefault();
        event.stopPropagation();

        this.context.store.routes.toDeck(this.props.deckID);
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
                <h6 className="list-group-item-heading m-y-0">
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

// this is a placeholder component on initial load/mount to occupy the space
// that the component will cover in order to prevent any inducement of jank.
const DeckListItemWaiting = React.createClass({

    onClick(event) {
        event.preventDefault();
        event.stopPropagation();

    },

    render() {

        return (
            <li className="list-group-item">
                <a href="#" onClick={this.onClick} style={{color: '#ffffff'}} >
                    {'loading'}
                </a>
            </li>
        );
    }
});

module.exports = courier({

    component: DeckListItem,
    waitingComponent: DeckListItemWaiting,

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    shouldRewatch(props) {

        const oldDeckID = this.currentProps.deckID;
        const newDeckID = props.deckID;

        return oldDeckID != newDeckID;
    },

    watch(props, manual, context) {

        const deckID = props.deckID;

        return context.store.decks.observable(deckID);
    },

    assignNewProps: function(props, context) {

        const deckID = props.deckID;

        return context.store.decks.get(deckID)
            .then(function(deck) {
                return {
                    deck: deck
                };
            });
    }
});
