const React = require('react');
const invariant = require('invariant');

const courier = require('courier');
const {types: ROUTES} = require('store/routes');

const LibraryDecks = require('./decks');
const CardsList = require('./cards');

const LibraryDetail = React.createClass({

    propTypes: {
        Handler: React.PropTypes.oneOfType([ React.PropTypes.func, React.PropTypes.string ])
    },

    render() {

        const {Handler} = this.props;

        return (
            <div>
                <Handler />
            </div>
        );
    }
});



// const WaitingLibraryDetail = React.createClass({
//     render() {
//         return (
//             <div>
//                 {'waiting'}
//             </div>
//         );
//     }
// });

module.exports = courier({
    component: LibraryDetail,
    // waitingComponent: WaitingLibraryDetail,

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
            Handler = CardsList;
            break;

        case ROUTES.LIBRARY.VIEW.DECKS:
            Handler = LibraryDecks;
            break;

        case ROUTES.LIBRARY.VIEW.DESCRIPTION:
            break;

        case ROUTES.LIBRARY.VIEW.META:
            break;

        default:
            invariant(false, `Invalid routeID. Given: ${route}`);
        }

        return {
            Handler: Handler
        };
    }
});
