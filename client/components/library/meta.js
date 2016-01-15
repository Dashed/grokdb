const React = require('react');
const _ = require('lodash');
const classnames = require('classnames');

const courier = require('courier');

const DeckMeta = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        hasParent: React.PropTypes.bool.isRequired,
        parentID: React.PropTypes.number.isRequired,
        name: React.PropTypes.string.isRequired,
        rootID: React.PropTypes.number.isRequired,
        deckID: React.PropTypes.number.isRequired
    },

    getInitialState() {
        return {
            name: void 0,
            verifyDelete: false
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

    deleteDeckVerify(event) {
        event.preventDefault();
        event.stopPropagation();

        this.setState({
            verifyDelete: true
        });
    },

    cancelDeleteDeck(event) {
        event.preventDefault();
        event.stopPropagation();

        this.setState({
            verifyDelete: false
        });
    },

    confirmDelete(event) {
        event.preventDefault();
        event.stopPropagation();

        if(this.props.rootID == this.props.deckID || !this.props.hasParent) {
            return null;
        }

        this.context.store.decks.remove(this.props.deckID)
        .then(() => {

            this.context.store.routes.toLibraryDecks(this.props.parentID);

            return null;
        });
    },

    getDeleteButton() {

        if(this.state.verifyDelete) {
            return (
                <div key="delete_deck">
                    <p className="card-text">
                        {'Are you sure?'}
                    </p>
                    <a
                        href="#"
                        className="btn btn-secondary btn-sm"
                        onClick={this.confirmDelete}
                    >
                        {'Yes, delete'}
                    </a>
                    {' '}
                    <a
                        href="#"
                        className="btn btn-secondary btn-sm"
                        onClick={this.cancelDeleteDeck}
                    >
                        {'No, cancel'}
                    </a>
                </div>
            );
        }

        return (
            <div key="delete_deck">
                <a
                    href="#"
                    className="btn btn-danger btn-sm"
                    onClick={this.deleteDeckVerify}
                >
                    {'Delete this Deck'}
                </a>
            </div>
        );

    },

    getDeleteSection() {

        if(this.props.rootID == this.props.deckID || !this.props.hasParent) {
            return null;
        }

        return (
            <div className="row">
                <div className="col-sm-12">
                    <div className="card">
                        <div className="card-header">
                            <strong>{'Delete Deck'}</strong>
                        </div>
                        <div className="card-block">
                            <p className="card-text">
                                {'Once you delete a deck, there is no going back. Please be certain.'}
                            </p>
                            <p className="card-text">
                                <ul>
                                    <li>{'Any cards within this deck will also be deleted'}</li>
                                    <li>{'Any cards within this deck will be removed from stashes'}</li>
                                </ul>
                            </p>
                            {this.getDeleteButton()}
                        </div>
                    </div>
                </div>
            </div>
        );
    },

    render() {
        return (
            <div className="row">
                <div className="col-sm-12">
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
                    {this.getDeleteSection()}
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
                    hasParent: deck.get('has_parent'),
                    parentID: deck.get('parent'),
                    rootID: context.store.decks.root(),
                    deckID: deck.get('id'),
                    name: deck.get('name')
                };

            });
    }
});
