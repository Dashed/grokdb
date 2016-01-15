const React = require('react');
const Immutable = require('immutable');
const _ = require('lodash');

const courier = require('courier');

const filterInteger = require('utils/filterinteger');

const DumbDeckListItem = require('components/deck/listitem');
const DeckListItemWaiting = require('components/deck/waitinglistitem');
const DumbBreadcrumb = require('components/deck/breadcrumb');
const BreadcrumbWaiting = require('components/deck/waitingbreadcrumb');


const NOT_SET = {};

const isNullValue = function(props, propName) {

    if(!_.isNull(props[propName])) {
        return new Error('Expected null');
    }

};

const Breadcrumb = courier({

    component: DumbBreadcrumb,
    waitingComponent: BreadcrumbWaiting,

    onlyWaitingOnMount: true,

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        // current deck to view decks from
        deckID: React.PropTypes.oneOfType([
            React.PropTypes.number.isRequired,
            isNullValue
        ]),
        rootDeckID: React.PropTypes.number.isRequired,
        onSwitch: React.PropTypes.func.isRequired
    },

    assignNewProps: function(props, context) {

        let {deckID} = props;

        const toDeck = (newdeckID) => {
            props.onSwitch.call(void 0, newdeckID);
        };

        if(_.isNull(props.deckID)) {
            return {
                path: [],
                toDeck
            };
        }

        return context.store.decks.path(deckID)
            .then(function(path) {
                return {
                    path: path,
                    toDeck
                };
            });
    }
});

const DeckListItem = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        card: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        deckID: React.PropTypes.number.isRequired,
        deck: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        onSwitch: React.PropTypes.func.isRequired,
        showButton: React.PropTypes.bool.isRequired,
        afterMove: React.PropTypes.func.isRequired
    },

    getDefaultProps() {
        return {
            afterMove: () => void 0
        };
    },

    onClick() {
        this.props.onSwitch.call(void 0, this.props.deckID);
    },

    onClickSideButton() {

        // const currentDeckID = this.context.store.decks.currentID();

        const {card, deckID} = this.props;

        const patch = {
            deck: deckID
        };

        const shouldMovePromise = this.context.store.decks.get(deckID)
            .then((currentDeck) => {

                if(currentDeck.get('ancestors').indexOf(card.get('deck')) >= 0) {

                    // if card's parent deck is an ancestor of the new deck, then
                    // dont update current deck.
                    return false;
                }

                // otherwise, set new deck as current deck
                return true;
            });

        const movePromise = this.context.store.cards.patch(card.get('id'), patch);

        Promise.all([shouldMovePromise, movePromise])
            .then(([shouldMove]) => {

                if(!shouldMove) {
                    return null;
                }

                this.props.afterMove.call(void 0, deckID);

                return null;
            });


    },

    render() {

        const {deck, deckID} = this.props;

        return (
            <DumbDeckListItem
                showSideButton={this.props.showButton}
                sideButtonLabel="Move to"
                onClickSideButton={this.onClickSideButton}
                deck={deck}
                deckID={deckID}
                onClick={this.onClick}
            />
        );
    }
});

const CourierDeckListItem = courier({

    component: DeckListItem,
    waitingComponent: DeckListItemWaiting,

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        deckID: React.PropTypes.number.isRequired
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

const DecksList = React.createClass({

    propTypes: {

        card: React.PropTypes.instanceOf(Immutable.Map).isRequired,

        parentDeckID: React.PropTypes.oneOfType([
            React.PropTypes.number.isRequired,
            isNullValue
        ]),

        cardParentDeck: React.PropTypes.number.isRequired,

        listOfDeckID: React.PropTypes.array.isRequired,
        onSwitch: React.PropTypes.func.isRequired,
        hasParent: React.PropTypes.bool.isRequired,
        afterMove: React.PropTypes.func.isRequired
    },

    getDefaultProps() {
        return {
            afterMove: () => void 0
        };
    },

    getList() {

        if(this.props.listOfDeckID.length <= 0) {
            return (
                <li className="list-group-item text-center text-muted">
                    {'No decks to display'}
                </li>
            );
        }

        return _.reduce(this.props.listOfDeckID, (accumulator, deckID) => {

            const key = '' + accumulator.length + deckID;

            accumulator.push(
                <CourierDeckListItem
                    key={key}
                    card={this.props.card}
                    deckID={deckID}
                    showButton={this.props.cardParentDeck != deckID}
                    onSwitch={this.props.onSwitch}
                    afterMove={this.props.afterMove}
                />
            );

            return accumulator;
        }, []);

    },

    onClickUp(event) {
        event.preventDefault();
        event.stopPropagation();

        this.props.onSwitch.call(void 0, this.props.parentDeckID);
    },

    goBackUp() {

        if(!this.props.hasParent) {

            return null;
        }

        return (
            <li key="up" className="list-group-item">
                <h6 className="list-group-item-heading m-y-0">
                    <a href="#" onClick={this.onClickUp}>
                        {'Go back up one deck level'}
                    </a>
                </h6>
            </li>
        );
    },

    render() {
        return (
            <ul className="list-group list-group-flush">
                {this.goBackUp()}
                {this.getList()}
            </ul>
        );
    }
});

const WrappedDecksList = courier({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        // current deck to view decks from
        deckID: React.PropTypes.oneOfType([
            React.PropTypes.number.isRequired,
            isNullValue
        ]),

        rootDeckID: React.PropTypes.number.isRequired
    },

    component: DecksList,

    onlyWaitingOnMount: true,

    assignNewProps: function(props, context) {

        if(filterInteger(props.deckID, NOT_SET) == NOT_SET) {
            // only display the root deck
            return {
                listOfDeckID: [props.rootDeckID],
                parentDeckID: null,
                hasParent: false
            };
        }

        return context.store.decks.get(props.deckID)
            .then(function(deck) {

                return {
                    listOfDeckID: deck.get('children').toArray(),
                    parentDeckID: deck.get('has_parent') ? deck.get('parent') : null,
                    hasParent: true
                };

            });
    }
});

const CardMetaMove = React.createClass({

    propTypes: {

        // default deckt to fetch children from
        sourceOfChildren: React.PropTypes.oneOfType([
            React.PropTypes.number.isRequired,
            isNullValue
        ]),

        card: React.PropTypes.instanceOf(Immutable.Map).isRequired,

        rootDeckID: React.PropTypes.number.isRequired,
        cardParentDeck: React.PropTypes.number.isRequired,
        afterMove: React.PropTypes.func.isRequired
    },

    getDefaultProps() {
        return {
            afterMove: () => void 0
        };
    },

    getInitialState() {
        return {
            // deck whose children we're listing
            currentDeckID: void 0
        };
    },

    getCurrentDeckID() {

        if(this.state.currentDeckID === void 0) {
            return this.props.sourceOfChildren;
        }

        return this.state.currentDeckID;

    },

    onSwitch(newDeckID) {

        this.setState({
            currentDeckID: newDeckID
        });

    },

    render() {
        return (
            <div className="row">
                <div className="col-sm-12">
                    <div className="card">
                        <div className="card-header">
                            <strong>{'Move to another Deck'}</strong>
                        </div>
                        <Breadcrumb
                            deckID={this.getCurrentDeckID()}
                            rootDeckID={this.props.rootDeckID}
                            onSwitch={this.onSwitch}
                        />
                        <WrappedDecksList
                            card={this.props.card}
                            deckID={this.getCurrentDeckID()}
                            rootDeckID={this.props.rootDeckID}
                            cardParentDeck={this.props.cardParentDeck}
                            onSwitch={this.onSwitch}
                            afterMove={this.props.afterMove}
                        />
                    </div>
                </div>
            </div>
        );
    }

});

module.exports = courier({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        card: React.PropTypes.instanceOf(Immutable.Map).isRequired
    },

    component: CardMetaMove,

    assignNewProps: function(props, context) {

        const rootDeckID = context.store.decks.root();
        const cardParentDeck = props.card.get('deck');

        return context.store.decks.get(cardParentDeck)
            .then(function(deck) {

                const sourceOfChildren = deck.get('has_parent') ? deck.get('parent') : null;

                return {
                    sourceOfChildren: sourceOfChildren,
                    rootDeckID: rootDeckID,
                    cardParentDeck: cardParentDeck
                };

            });

    }
});
