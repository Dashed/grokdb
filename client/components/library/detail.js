const React = require('react');
const invariant = require('invariant');

const courier = require('courier');
const {types: ROUTES} = require('store/routes');

const LibraryDecks = require('./decks');
const LibraryCards = require('./cards');
const AddDeck = require('./adddeck');
const AddCard = require('./addcard');
const Description = require('./description');
const Meta = require('./meta');

const LibraryDetail = React.createClass({

    propTypes: {
        Handler: React.PropTypes.oneOfType([ React.PropTypes.func, React.PropTypes.string ])
    },

    render() {

        const {Handler} = this.props;

        return (
            <Handler />
        );
    }
});

module.exports = courier({

    component: LibraryDetail,

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    watch(props, manual, context) {
        return context.store.routes.watchRoute();
    },

    assignNewProps: function(props, context) {

        const route = context.store.routes.route();

        let Handler;

        switch(route) {
        case ROUTES.LIBRARY.VIEW.CARDS:
            Handler = LibraryCards;
            break;

        case ROUTES.LIBRARY.VIEW.DECKS:
            Handler = LibraryDecks;
            break;

        case ROUTES.LIBRARY.VIEW.ADD_DECK:
            Handler = AddDeck;
            break;

        case ROUTES.LIBRARY.VIEW.ADD_CARD:
            Handler = AddCard;
            break;

        case ROUTES.LIBRARY.VIEW.DESCRIPTION:
            Handler = Description;
            break;

        case ROUTES.LIBRARY.VIEW.META:
            Handler = Meta;
            break;

        default:
            invariant(false, `Invalid routeID. Given: ${route}`);
        }

        return {
            Handler: Handler
        };
    }
});
