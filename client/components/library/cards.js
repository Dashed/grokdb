const React = require('react');
const _ = require('lodash');

const courier = require('courier');

const CardListItem = require('./cardlistitem');

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


const CardsList = courier({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    component: DumbCardsList,

    watch(props, manual, context) {
        return context.store.decks.watchCurrentID();
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

        console.log('toReview');

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
                        >{'Review this deck'}</a>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <CardsList />
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = LibraryCards;
