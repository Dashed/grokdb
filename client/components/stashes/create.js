const React = require('react');
const TextareaAutosize = require('react-textarea-autosize');
const classnames = require('classnames');

const RenderSourceTabs = require('components/rendersourcetabs');
const MarkdownPreview = require('components/markdownpreview');

const CreateStash = React.createClass({

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

    backToStashesList(event) {
        event.preventDefault();
        event.stopPropagation();

        this.context.store.routes.toStashes();
    },

    onStashSave(event) {
        event.preventDefault();
        event.stopPropagation();

        if(!this.shouldAddStash()) {
            return;
        }

        const confirm = this.context.store.routes.confirm();

        if(confirm == this.confirmDiscard) {
            this.context.store.routes.removeConfirm();
        }

        // disable the button to prevent spamming.
        // e.g. atomic commit
        this.setState({
            disableAdd: true
        });

        this.context.store.stashes.create({
            name: String(this.state.name).trim(),
            description: this.state.description
        })
        .then(() => {

            this.context.store.routes.toStashes();

            return null;
        });

        // TODO: error. restore add button

    },

    shouldAddStash() {
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

    onNameChange(event) {

        this.setState({
            name: String(event.target.value)
        });
    },

    onDescriptionChange(event) {

        this.setState({
            description: event.target.value
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
                id="stash_description"
                placeholder={'Description for a new stash'}
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

        return 'You have unsaved changes for a new stash. Are you sure you want to discard these changes?';

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
        this.refs.stash_name.focus();
    },

    render() {
        return (
            <div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={this.backToStashesList}
                        >{'Back to List of Stashes'}</button>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <h5 className="m-y-0 p-y-0">
                            {'Create New Stash'}
                        </h5>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <input
                            ref="stash_name"
                            className="form-control"
                            type="text"
                            onChange={this.onNameChange}
                            value={this.state.name}
                            placeholder="Name of new stash"
                        />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <RenderSourceTabs
                            showRender={this.state.showRender}
                            onSwitch={this.onSwitchTab}
                            showEditButton={false}
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
                                'disabled': this.state.disableAdd || !this.shouldAddStash()
                            })}
                            role="button"
                            onClick={this.onStashSave}
                        >
                            {'Add new stash'}
                        </a>
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = CreateStash;
