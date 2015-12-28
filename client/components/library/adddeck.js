const React = require('react');
const TextareaAutosize = require('react-textarea-autosize');
const classnames = require('classnames');

const RenderSourceTabs = require('components/rendersourcetabs');
const MarkdownPreview = require('components/markdownpreview');

const AddDeck = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    getInitialState() {
        return {
            disableAdd: false,
            showRender: false,
            name: '',
            description: ''
        };
    },

    shouldAddDeck() {
        return String(this.state.name).trim().length > 0;
    },

    onSwitchTab(tabType) {

        let showRender = true;

        switch(tabType) {
        case 'render':
            showRender = true;
            break;
        case 'source':
            showRender = false;
            break;
        default:
            throw Error(`Unexpected tabType. Given: ${tabType}`);
        };

        this.setState({
            showRender: showRender
        });

    },

    backToDecksList(event) {
        event.preventDefault();
        event.stopPropagation();

        this.context.store.routes.toLibraryDecks();
    },

    onDeckSave(event) {
        event.preventDefault();
        event.stopPropagation();

        if(!this.shouldAddDeck()) {
            return;
        }


        const confirm = this.context.store.routes.confirm();

        if(confirm == this.confirmDiscard) {
            this.context.store.routes.removeConfirm();
        }

        this.setState({
            disableAdd: true
        });

        const parentDeckID = this.context.store.decks.currentID();

        this.context.store.decks.create({
            name: String(this.state.name).trim(),
            description: this.state.description,
            parent: parentDeckID
        })
        .then(() => {

            this.context.store.routes.toLibraryDecks();

            return null;
        });

    },

    onDescriptionChange(event) {

        this.setState({
            description: event.target.value
        });
    },

    onNameChange(event) {

        this.setState({
            name: String(event.target.value)
        });
    },

    getDescriptionComponent() {

        const description = this.state.description;

        if(this.state.showRender) {
            return <MarkdownPreview key="preview" text={description} />;
        }

        return (
            <TextareaAutosize
                key="textarea"
                useCacheForDOMMeasurements
                minRows={6}
                maxRows={10}
                className="form-control"
                id="deck_description"
                placeholder={'Description for new deck'}
                onChange={this.onDescriptionChange}
                value={this.state.description}
                readOnly={false}
            />
        );
    },

    confirmDiscard() {

        if(String(this.state.name).trim().length <= 0 && String(this.state.description).length <= 0) {
            return void 0;
        }

        return 'You have unsaved changes for a new deck. Are you sure you want to discard these changes?';

    },

    componentWillMount() {
        this.context.store.routes.confirm(this.confirmDiscard);
    },

    componentWillUnmount() {

        const confirm = this.context.store.routes.confirm();

        if(confirm == this.confirmDiscard) {
            this.context.store.routes.removeConfirm();
        }
    },

    componentDidMount() {
        this.refs.deck_name.focus();
    },

    render() {

        return (
            <div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={this.backToDecksList}
                        >{'Back to decks list'}</button>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <input
                            ref="deck_name"
                            className="form-control"
                            type="text"
                            onChange={this.onNameChange}
                            value={this.state.name}
                            placeholder="Name of new deck"
                        />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <RenderSourceTabs
                            showRender={this.state.showRender}
                            onSwitch={this.onSwitchTab}
                            showEditButton={false}
                            isEditing
                        />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        {this.getDescriptionComponent()}
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <hr />
                        <a
                            href="#"
                            className={classnames('btn', 'btn-success', 'btn-sm', {
                                'disabled': this.state.disableAdd || !this.shouldAddDeck()
                            })}
                            role="button"
                            onClick={this.onDeckSave}
                        >
                            {'Add new deck'}
                        </a>
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = AddDeck;
