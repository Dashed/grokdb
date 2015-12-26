const React = require('react');
const _ = require('lodash');
const invariant = require('invariant');

const courier = require('courier');

const Breadcrumb = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        path: React.PropTypes.array.isRequired
    },

    toDeck(deckID) {
        return (event) => {
            event.preventDefault();
            event.stopPropagation();

            this.context.store.routes.toDeck(deckID);
        };
    },

    generateCrumb() {

        const {path} = this.props;

        invariant(path.length >= 1, 'Expected path to be non-empty');

        const end = path.length - 1;

        return _.map(path, (deck, index) => {

            const deckID = deck.get('id');

            const key = '' + deckID + index;

            if(end == index) {
                return (
                    <li key={key} className="active">
                        {deck.get('name')}
                    </li>
                );
            }

            return (
                <li key={key}>
                    <a
                    onClick={this.toDeck(deckID)}
                    href="#">{deck.get('name')}</a>
                </li>
            );
        });
    },

    render() {

        return (
            <ol className="breadcrumb m-y-0">
                {this.generateCrumb()}
            </ol>
        );
    }
});

// this is a placeholder component on initial load/mount to occupy the space
// that the component will cover in order to prevent any inducement of jank.
const BreadcrumbWaiting = React.createClass({
    render() {
        return (
            <ol className="breadcrumb m-y-0">
                <li className="active" style={{color: '#eceeef'}}>
                    {'.'}
                </li>
            </ol>
        );
    }
});

module.exports = courier({

    component: Breadcrumb,
    waitingComponent: BreadcrumbWaiting,

    onlyWaitingOnMount: true,

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    watch(props, manual, context) {
        return context.store.decks.watchCurrent();
    },

    assignNewProps: function(props, context) {

        const deckID = context.store.decks.currentID();

        return context.store.decks.path(deckID)
            .then(function(path) {
                return {
                    path: path
                };
            });
    }
});
