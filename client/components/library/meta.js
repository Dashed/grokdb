const React = require('react');
const _ = require('lodash');
const classnames = require('classnames');

const courier = require('courier');

const DeckMeta = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        name: React.PropTypes.string.isRequired
    },

    getInitialState() {
        return {
            name: void 0
        };
    },

    onNameChange(event) {

        this.setState({
            name: String(event.target.value)
        });
    },

    deckName() {

        const name = this.state.name;

        if(_.isString(name)) {
            return name;
        }

        return this.props.name;

    },

    renameDeck(event) {
        event.preventDefault();
        event.stopPropagation();

        if(!_.isString(this.state.name) ||
            this.state.name.trim().length <= 0 ||
            this.state.name.trim() == this.props.name) {
            return;
        }

        this.context.store.decks.patchCurrent({
            name: String(this.state.name).trim()
        });
    },

    render() {
        return (
            <div className="row">
                <div className="col-sm-12">
                    <div className="card">
                        <div className="card-header">
                            <strong>{'Deck name'}</strong>
                        </div>
                        <div className="card-block">
                            <p className="card-text">
                                <input
                                    ref="deck_name"
                                    className="form-control"
                                    type="text"
                                    onChange={this.onNameChange}
                                    value={this.deckName()}
                                    placeholder="Name of Deck"
                                />
                            </p>
                            <a
                                href="#"
                                className={classnames('btn', 'btn-success', 'btn-sm', {
                                    'disabled': !_.isString(this.state.name) ||
                                        this.state.name.trim().length <= 0 ||
                                        this.state.name.trim() == this.props.name
                                })}
                                onClick={this.renameDeck}
                            >
                                {'Rename Deck'}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = courier({

    component: DeckMeta,

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    watch(props, manual, context) {
        return context.store.decks.watchCurrent();
    },

    assignNewProps: function(props, context) {

        return context.store.decks.current()
            .then(function(deck) {

                return {
                    name: deck.get('name')
                };

            });
    }
});
