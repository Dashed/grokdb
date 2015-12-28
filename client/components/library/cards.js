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
                        {''}
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

    // watch(props, manual, context) {
    //     return context.store.cards.watchCurrentCards();
    // },

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

    render() {
        return (
            <div>
                <div className="row m-b">
                    <div className="col-sm-12">
                        <div className="btn-group btn-group-sm" role="group" aria-label="Basic example">
                            <button
                                type="button"
                                className="btn btn-success"
                                onClick={this.toNewCard}
                            >{'New Card'}</button>
                        </div>
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
