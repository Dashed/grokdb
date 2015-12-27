const React = require('react');
const _ = require('lodash');
const Immutable = require('immutable');

const courier = require('courier');

const DeckListItem = require('./decklistitem');

const LibraryDecks = React.createClass({

    propTypes: {
        childrenID: React.PropTypes.instanceOf(Immutable.List).isRequired
    },

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    toNewDeck(event) {
        event.preventDefault();
        event.stopPropagation();

        this.context.store.routes.toAddNewDeck();

    },

    deckList() {

        const childrenID = this.props.childrenID;

        return childrenID.map((deckID, index) => {

            const key = '' + deckID + index;

            return (
                <DeckListItem key={key} deckID={deckID} />
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
                                onClick={this.toNewDeck}
                            >{'New Deck'}</button>
                        </div>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <ul className="list-group">
                            {this.deckList()}
                        </ul>
                    </div>
                </div>
            </div>
        );
    }
});


module.exports = courier({

    component: LibraryDecks,

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    watch(props, manual, context) {
        return context.store.decks.watchCurrent();
    },

    assignNewProps: function(props, context) {

        const childrenID = context.store.decks.childrenID();

        return {
            childrenID: childrenID
        };

    }

});
