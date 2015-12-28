const React = require('react');
const TextareaAutosize = require('react-textarea-autosize');
const _ = require('lodash');
const classnames = require('classnames');

const MarkdownPreview = require('components/markdownpreview');
const RenderSourceTabs = require('components/rendersourcetabs');
const CardTabs = require('components/card/tabs');

const AddCard = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        // Handler: React.PropTypes.oneOfType([ React.PropTypes.func, React.PropTypes.string ])
    },

    getInitialState() {
        return {

            disableAdd: false,

            currentTab: 'Front',

            title: '',

            front: {
                showRender: false,
                source: ''
            },

            back: {
                showRender: false,
                source: ''
            },

            description: {
                showRender: false,
                source: ''
            }
        };
    },

    onTitleChange(event) {

        this.setState({
            title: String(event.target.value)
        });
    },

    backToCardsList(event) {
        event.preventDefault();
        event.stopPropagation();

        this.context.store.routes.toLibraryCards();
    },

    getCurrentTab() {

        let key = 'front';

        switch(this.state.currentTab) {

        case 'Front':
            key = 'front';
            break;

        case 'Back':
            key = 'back';
            break;

        case 'Description':
            key = 'description';
            break;

        default:
            throw Error(`Unexpected currentTab value. Given: ${this.state.currentTab}`);
        }

        return key;

    },

    getCurrentSwitchRenderSourceTab() {
        return this.state[this.getCurrentTab()].showRender;
    },

    onSwitchRenderSourceTab(tabType) {

        let currentTab = this.getCurrentTab();

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
            [currentTab]: _.assign({}, this.state[currentTab], {
                showRender: showRender
            })
        });

    },

    onSourceChange(event) {

        const newSource = event.target.value || '';
        const currentTab = this.getCurrentTab();

        this.setState({
            [currentTab]: _.assign({}, this.state[currentTab], {
                source: String(newSource)
            })
        });

    },

    getChildComponent() {

        const currentTab = this.getCurrentTab();

        const source = this.state[currentTab].source;
        const showRender = this.state[currentTab].showRender;

        if(showRender) {
            return <MarkdownPreview key="preview" text={source} />;
        }

        const placeholder = (function() {
            switch(currentTab) {
            case 'front':
                return 'Front side for new card';
                break;

            case 'back':
                return 'Back side for new card';
                break;

            case 'description':
                return 'Description for new card';
                break;

            default:
                throw Error(`Unexpected currentTab. Given: ${currentTab}`);
            }
        })();

        return (
            <TextareaAutosize
                key="textarea"
                useCacheForDOMMeasurements
                minRows={6}
                maxRows={10}
                className="form-control"
                id="deck_source"
                placeholder={placeholder}
                onChange={this.onSourceChange}
                value={source}
                readOnly={false}
            />
        );

    },

    onSwitchCurrentTab(tabType) {

        this.setState({
            currentTab: tabType
        });

    },

    shouldAddCard() {

        return String(this.state.title).trim().length > 0;
    },

    onCardSave(event) {
        event.preventDefault();
        event.stopPropagation();

        if(!this.shouldAddCard()) {
            return;
        }

        // disable the button to prevent spamming.
        // e.g. atomic commit
        this.setState({
            disableAdd: true
        });

        const parentDeckID = this.context.store.decks.currentID();

        this.context.store.cards.create(
            parentDeckID,
            {
                title: String(this.state.title).trim(),
                description: this.state.description.source,
                front: this.state.front.source,
                back: this.state.back.source
            }
        ).then(() => {

            this.context.store.routes.toLibraryCards();

            return null;
        });

    },

    render() {

        return (
            <div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={this.backToCardsList}
                        >{'Back to cards list'}</button>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <input
                            ref="card_title"
                            className="form-control"
                            type="text"
                            onChange={this.onTitleChange}
                            value={this.state.title}
                            placeholder="Title of new card"
                        />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <CardTabs
                            currentTab={this.state.currentTab}
                            onSwitch={this.onSwitchCurrentTab}
                        />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <RenderSourceTabs
                            showRender={this.getCurrentSwitchRenderSourceTab()}
                            onSwitch={this.onSwitchRenderSourceTab}
                            showEditButton={false}
                        />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        {this.getChildComponent()}
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <hr />
                        <a
                            href="#"
                            className={classnames('btn', 'btn-success', 'btn-sm', {
                                'disabled': this.state.disableAdd || !this.shouldAddCard()
                            })}
                            role="button"
                            onClick={this.onCardSave}
                        >
                            {'Add new card'}
                        </a>
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = AddCard;
