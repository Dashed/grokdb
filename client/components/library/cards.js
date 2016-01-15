const React = require('react');
const _ = require('lodash');
const shallowEqual = require('shallowequal');

const courier = require('courier');

const CardListItem = require('./cardlistitem');
const CardsSortDropDown = require('./cardssortdropdown');
const CardsPagination = require('./cardspagination');
const WaitingCardListItem = require('components/card/waitingcardlistitem');

const DumbCardsList = React.createClass({

    propTypes: {
        cardIDs: React.PropTypes.array.isRequired
    },

    cardsList() {

        const cardIDs = this.props.cardIDs;

        if(cardIDs.length <= 0) {
            return (
                <div className="card">
                    <div className="card-block text-center">
                        <p className="card-text text-muted">
                            {'No cards to display. To get started, you should create your first card for this deck.'}
                        </p>
                    </div>
                </div>
            );
        }

        const items = _.map(cardIDs, (cardID, index) => {

            const key = '' + cardID + index;

            return (
                <CardListItem key={key} cardID={cardID} />
            );

        });

        return (
            <ul className="list-group">
                {items}
            </ul>
        );

    },

    render() {
        return (
            <div className="row">
                <div className="col-sm-12">
                    {this.cardsList()}
                </div>
            </div>
        );
    }
});

const WaitingDumbCardsList = React.createClass({

    cardsList() {

        let items = [];

        let n = 1;

        while(n-- > 0) {
            items.push(
                <WaitingCardListItem key={n} />
            );
        }

        return (
            <ul className="list-group">
                {items}
            </ul>
        );
    },

    render() {
        return (
            <div className="row">
                <div className="col-sm-12">
                    {this.cardsList()}
                </div>
            </div>
        );
    }

});


const CardsList = courier({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    component: DumbCardsList,
    waitingComponent: WaitingDumbCardsList,

    onlyWaitingOnMount: true,

    watch(props, manual, context) {
        return [
            context.store.cards.watchPage(),
            context.store.decks.watchCurrentID(),
            context.store.cards.watchOrder(),
            context.store.cards.watchSort()
        ];
    },

    shouldComponentUpdate(nextProps) {
        // don't reload cards list when cardIDs are the same.
        // when a new page is requested, wrapped component may be pinged to
        // re-render on same cardIDs as new page resolves.
        return !shallowEqual(nextProps.cardIDs, this.props.cardIDs);
    },

    assignNewProps: function(props, context) {

        return context.store.cards.currentCardsID()
            .then((cardIDs) => {

                return {
                    cardIDs: cardIDs
                };

            });
    }

});

const LibraryCards = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    toNewCard(event) {
        event.preventDefault();
        event.stopPropagation();

        this.context.store.routes.toAddNewCard();

    },

    toReview(event) {
        event.preventDefault();
        event.stopPropagation();

        this.context.store.routes.toDeckReview();

    },

    onClickPage(requestedPageNum) {
        this.context.store.routes.toLibraryCardsPage(requestedPageNum);
    },

    render() {
        return (
            <div>
                <div className="row m-b">
                    <div className="col-sm-12">
                        <a href="#"
                            className="btn btn-sm btn-success m-r"
                            onClick={this.toNewCard}
                        >{'New Card'}</a>
                        <a href="#"
                            className="btn btn-sm btn-primary-outline"
                            onClick={this.toReview}
                        >{'Review this Deck'}</a>

                        <div className="pull-right">
                            <CardsSortDropDown />
                        </div>
                    </div>
                </div>
                <div className="row m-b">
                    <div className="col-sm-12">
                        <CardsList />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <CardsPagination
                            onClickPage={this.onClickPage}
                        />
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = LibraryCards;
