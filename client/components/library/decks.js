const React = require('react');
const co = require('co');
const _ = require('lodash');
// TODO: remove
// const Immutable = require('immutable');

const courier = require('courier');


const DecksList = React.createClass({

    propTypes: {
        decks: React.PropTypes.array.isRequired
        // decks: React.PropTypes.instanceOf(Immutable.List).isRequired
    },

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    toNewDeck(event) {
        event.preventDefault();
        event.stopPropagation();


    },

    deckList() {

        const decks = this.props.decks;

        return _.map(decks, function(deck) {

            const deckName = deck.get('name');

            const key = '' + deckName + deck.get('id');

            return (<li key={key} className="list-group-item">{deckName}</li>);

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

    component: DecksList,

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    assignNewProps: function(props, context) {

        return co(function *() {

            const decks = yield context.store.decks.children();
            return {
                decks: decks
            };

        });

    }

});
