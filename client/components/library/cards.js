const React = require('react');
const _ = require('lodash');

const courier = require('courier');

const CardListItem = require('./cardlistitem');

const CardsList = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        cardIDs: React.PropTypes.array.isRequired
    },

    toNewCard(event) {
        event.preventDefault();
        event.stopPropagation();

        this.context.store.routes.toAddNewCard();

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
                        <ul className="list-group">
                            {this.cardsList()}
                        </ul>
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

    component: CardsList,

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
