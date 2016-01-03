const React = require('react');
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

        if(childrenID.size <= 0) {
            return (
                <div className="card">
                    <div className="card-block text-center">
                        <p className="card-text text-muted">
                            {'No decks to display. To get started, you should create your first nested deck for this deck.'}
                        </p>
                    </div>
                </div>
            );
        }

        const items = childrenID.map((deckID, index) => {

            const key = '' + deckID + index;

            return (
                <DeckListItem key={key} deckID={deckID} />
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
            <div>
                <div className="row m-b">
                    <div className="col-sm-12">
                        <div className="btn-group btn-group-sm" role="group">
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
                        {this.deckList()}
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
