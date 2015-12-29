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

        return _.map(cardIDs, (cardID, index) => {

            const key = '' + cardID + index;

            return (
                <CardListItem key={key} cardID={cardID} />
            );

        });

    },

    render() {
        return (
            <div className="row">
                <div className="col-sm-12">
                    <ul className="list-group">
                        {this.cardsList()}
                    </ul>
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
