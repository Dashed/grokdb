const React = require('react');
const TextareaAutosize = require('react-textarea-autosize');
const _ = require('lodash');
const classnames = require('classnames');

const courier = require('courier');
const RenderSourceTabs = require('components/rendersourcetabs');
const MarkdownPreview = require('components/markdownpreview');

const DeckDescription = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        description: React.PropTypes.string.isRequired
    },

    getInitialState() {
        return {
            showRender: true,
            isEditing: false,
            newDescription: void 0
        };
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

    onEdit() {

        this.context.store.routes.confirm(this.confirmDiscard);

        this.setState({
            isEditing: true,
            showRender: false,
            newDescription: void 0
        });

    },

    onCancelEdit() {

        if(this.state.isEditing && _.isString(this.state.newDescription)) {
            const ret = window.confirm(this.confirmDiscard());
            if(!ret) {
                return;
            }
        }

        this.setState({
            isEditing: false,
            showRender: true,

            // discard any changes
            newDescription: void 0
        });
    },

    onDescriptionChange(event) {

        this.setState({
            newDescription: event.target.value
        });
    },

    onDescriptionSave(event) {
        event.preventDefault();
        event.stopPropagation();

        if(!_.isString(this.state.newDescription)) {
            return;
        }

        this.setState({
            isEditing: false,
            showRender: true
            // note: leave newDescription alone for optimistic update
        });

        this.context.store.decks.patchCurrent({
            description: this.state.newDescription
        });

    },

    getDescription() {

        // this.state.newDescription has precedence over this.props.description

        const description = this.state.newDescription;

        if(_.isString(description)) {
            return description;
        }

        return this.props.description;

    },

    getDescriptionComponent() {

        const description = this.getDescription();

        if(this.state.showRender) {
            return <MarkdownPreview key="preview" text={description} />;
        }

        const placeholder = this.state.isEditing ?
            'Enter a description for this deck.' :
            'No description given.';

        return (
            <TextareaAutosize
                ref={function(input) {
                    if (input != null) {
                        input.focus();
                    }
                }}
                key="textarea"
                useCacheForDOMMeasurements
                minRows={6}
                maxRows={10}
                className="form-control"
                id="deck_description"
                placeholder={placeholder}
                onChange={this.onDescriptionChange}
                value={description}
                readOnly={!this.state.isEditing}
            />
        );
    },

    getSaveComponent() {

        if(!this.state.isEditing) {
            return null;
        }

        return (
            <div className="row">
                <div className="col-sm-12">
                    <hr />
                    <a
                        href="#"
                        className={classnames('btn', 'btn-success', 'btn-sm', {
                            'disabled': !_.isString(this.state.newDescription)
                        })}
                        role="button"
                        onClick={this.onDescriptionSave}
                    >
                        {'Save'}
                    </a>
                </div>
            </div>
        );

    },

    confirmDiscard() {

        if(this.state.isEditing && _.isString(this.state.newDescription)) {
            return 'You have unsaved changes for deck description. Are you sure you want to discard these changes?';
        }

    },

    componentWillUnmount() {

        const confirm = this.context.store.routes.confirm();

        if(confirm == this.confirmDiscard) {
            this.context.store.routes.removeConfirm();
        }
    },

    render() {

        return (
            <div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <RenderSourceTabs
                            showRender={this.state.showRender}
                            onSwitch={this.onSwitchTab}
                            isEditing={this.state.isEditing}
                            onEdit={this.onEdit}
                            onCancelEdit={this.onCancelEdit}
                        />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        {this.getDescriptionComponent()}
                    </div>
                </div>
                {
                    this.getSaveComponent()
                }
            </div>
        );
    }
});

module.exports = courier({

    component: DeckDescription,

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
                    description: deck.get('description')
                };

            });
    }
});
