const React = require('react');
const Immutable = require('immutable');
const _ = require('lodash');
const invariant = require('invariant');
const TextareaAutosize = require('react-textarea-autosize');
const classnames = require('classnames');

const {types: ROUTES} = require('store/routes');

const courier = require('courier');
const RenderSourceTabs = require('components/rendersourcetabs');
const MarkdownPreview = require('components/markdownpreview');

const CardHeader = require('./header');
const CardTabs = require('./tabs');

const CardDetail = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        currentDeckID: React.PropTypes.number.isRequired,
        currentTab: React.PropTypes.oneOf(['Front', 'Back', 'Description', 'Stashes', 'Meta']),
        currentCard: React.PropTypes.instanceOf(Immutable.Map).isRequired
    },

    getInitialState() {
        return {

            isEditing: false,
            disableSave: false,

            newTitle: void 0,

            front: {
                showRender: true,
                newSource: void 0
            },

            back: {
                showRender: true,
                newSource: void 0
            },

            description: {
                showRender: true,
                newSource: void 0
            }
        };
    },

    backToCardsList(event) {
        event.preventDefault();
        event.stopPropagation();

        this.context.store.routes.toLibraryCards();
    },

    onSwitchCurrentTab(tabType) {

        const cardID = this.props.currentCard.get('id');
        const deckID = this.props.currentDeckID;

        switch(tabType) {

        case 'Front':

            this.context.store.routes.toCardFront(cardID, deckID);
            break;

        case 'Back':

            this.context.store.routes.toCardBack(cardID, deckID);
            break;

        case 'Description':

            this.context.store.routes.toCardDescription(cardID, deckID);
            break;

        case 'Meta':

            this.context.store.routes.toCardMeta(cardID, deckID);
            break;

        case 'Stashes':

            this.context.store.routes.toCardStashes(cardID, deckID);
            break;

        default:
            invariant(false, `Unexpected tabType. Given: ${String(tabType)}`);

        }

    },

    getCurrentTab() {

        let key = 'front';

        switch(this.props.currentTab) {

        case 'Front':
            key = 'front';
            break;

        case 'Back':
            key = 'back';
            break;

        case 'Description':
            key = 'description';
            break;

        case 'Stashes':
            key = 'stashes';
            break;

        case 'Meta':
            key = 'meta';
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

    getTitleSource() {

        const newTitle = this.state.newTitle;

        if(_.isString(newTitle)) {
            return newTitle;
        }

        const {currentCard} = this.props;

        return currentCard.get('title');

    },

    onTitleChange(event) {

        this.setState({
            newTitle: String(event.target.value)
        });
    },

    getSource(currentTab) {

        // invarant: currentTab is one of front, back, or description

        const newSource = this.state[currentTab].newSource;

        if(_.isString(newSource)) {
            return newSource;
        }

        const {currentCard} = this.props;

        switch(currentTab) {
        case 'front':
            return currentCard.get('front');
            break;

        case 'back':
            return currentCard.get('back');
            break;

        case 'description':
            return currentCard.get('description');
            break;

        default:
            throw Error(`Unexpected currentTab. Given: ${currentTab}`);
        }

    },

    onSourceChange(event) {

        // invarant: currentTab is one of front, back, or description

        const newSource = event.target.value || '';
        const currentTab = this.getCurrentTab();

        this.setState({
            [currentTab]: _.assign({}, this.state[currentTab], {
                newSource: String(newSource)
            })
        });

    },

    getCardPropComponent() {

        // invarant: currentTab is one of front, back, or description

        const currentTab = this.getCurrentTab();

        const source = this.getSource(currentTab);
        const showRender = this.state[currentTab].showRender;

        if(showRender) {
            return <MarkdownPreview key="preview" text={source} />;
        }

        const placeholder = (() => {

            if(!this.state.isEditing) {
                return '';
            }

            // only show placeholder when editing

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
                readOnly={!this.state.isEditing}
            />
        );

    },

    getChildComponent() {

        const currentTab = this.getCurrentTab();

        switch(currentTab) {
        case 'front':
        case 'back':
        case 'description':

            return (
                <div>
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
                        <div className="col-sm-12">
                            {this.getCardPropComponent()}
                        </div>
                    </div>
                </div>
            );

            break;

        case 'stashes':

            return (
                <div>
                    <div className="row">
                        <div className="col-sm-12">
                            {'stashes'}
                        </div>
                    </div>
                </div>
            );

            break;

        case 'meta':

            return (
                <div>
                    <div className="row">
                        <div className="col-sm-12">
                            {'meta'}
                        </div>
                    </div>
                </div>
            );

            break;

        default:
            throw Error(`Unexpected currentTab. Given: ${currentTab}`);
        }
    },

    editCard(event) {
        event.preventDefault();
        event.stopPropagation();

        this.setState({
            isEditing: true,

            newTitle: void 0,

            front: {
                showRender: false,
                newSource: void 0
            },

            back: {
                showRender: false,
                newSource: void 0
            },

            description: {
                showRender: false,
                newSource: void 0
            }
        });
    },

    onCancelEdit(event) {
        event.preventDefault();
        event.stopPropagation();

        this.setState({
            isEditing: false,

            // discard any changes
            newTitle: void 0,

            front: {
                showRender: true,
                newSource: void 0
            },

            back: {
                showRender: true,
                newSource: void 0
            },

            description: {
                showRender: true,
                newSource: void 0
            }
        });
    },

    getEditCancelButton() {

        if(!this.state.isEditing) {

            return (
                <button
                    type="button"
                    className="btn btn-sm btn-success pull-right"
                    onClick={this.editCard}
                >{'Edit'}</button>
            );
        }

        return (
            <button
                type="button"
                className="btn btn-sm btn-danger pull-right"
                onClick={this.onCancelEdit}
            >{'Cancel Editing Card'}</button>
        );

    },

    shouldSaveCard() {

        const newTitle = this.state.newTitle;

        if(_.isString(newTitle) && newTitle.length <= 0) {
            return false;
        }

        return true;
    },

    onCardSave(event) {
        event.preventDefault();
        event.stopPropagation();

        if(!this.shouldSaveCard()) {
            return;
        }

        this.setState(_.assign({}, this.state, {
            isEditing: false,

            front: {
                showRender: true
            },

            back: {
                showRender: true
            },

            description: {
                showRender: true
            }

            // note: leave newSources alone for optimistic update
        }));

        let hasChanges = false;
        let patch = {};

        if(_.isString(this.state.newTitle)) {
            patch.title = this.state.newTitle;
            hasChanges = true;
        }

        if(_.isString(this.state.front.newSource)) {
            patch.front = this.state.front.newSource;
            hasChanges = true;
        }

        if(_.isString(this.state.back.newSource)) {
            patch.back = this.state.back.newSource;
            hasChanges = true;
        }

        if(_.isString(this.state.description.newSource)) {
            patch.description = this.state.description.newSource;
            hasChanges = true;
        }

        if(!hasChanges) {
            return;
        }

        this.context.store.cards.patchCurrent(patch);
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
                            'disabled': !this.shouldSaveCard()
                        })}
                        role="button"
                        onClick={this.onCardSave}
                    >
                        {'Save'}
                    </a>
                </div>
            </div>
        );

    },

    render() {
        return (
            <div>
                <div className="row">
                    <div className="col-sm-12 m-y">
                        <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={this.backToCardsList}
                        >{'Back to cards list'}</button>
                        {this.getEditCancelButton()}
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        {(function() {

                            if(this.state.isEditing) {
                                return (
                                    <input
                                        ref="card_title"
                                        className="form-control"
                                        type="text"
                                        onChange={this.onTitleChange}
                                        value={this.getTitleSource()}
                                        placeholder={`Title of card #${this.props.currentCard.get('id')}`}
                                    />
                                );
                            }

                            return (<CardHeader cardID={this.props.currentCard.get('id')} />);

                        }).call(this)}
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <CardTabs
                            currentTab={this.props.currentTab}
                            onSwitch={this.onSwitchCurrentTab} />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        {this.getChildComponent()}
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

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    component: CardDetail,

    // this is true so that CardDetail doesn't re-mount whenever Promise returned
    // from assignNewProps resolves.
    onlyWaitingOnMount: true,

    watch(props, manual, context) {
        return [
            context.store.routes.watchRoute(),
            context.store.cards.watchCurrent()
        ];
    },

    assignNewProps: function(props, context) {

        return context.store.cards.current()
            .then(function(currentCard) {

                const route = context.store.routes.route();

                let currentTab;

                switch(route) {

                case ROUTES.CARD.VIEW.FRONT:

                    currentTab = 'Front';
                    break;

                case ROUTES.CARD.VIEW.BACK:

                    currentTab = 'Back';
                    break;

                case ROUTES.CARD.VIEW.DESCRIPTION:

                    currentTab = 'Description';
                    break;

                case ROUTES.CARD.VIEW.META:

                    currentTab = 'Meta';
                    break;

                case ROUTES.CARD.VIEW.STASHES:

                    currentTab = 'Stashes';
                    break;

                default:
                    invariant(false, `Unexpected route. Given: ${String(this.props.route)}`);
                }

                const currentDeckID = context.store.decks.currentID();

                return {
                    currentDeckID: currentDeckID,
                    currentCard: currentCard,
                    currentTab
                };
            });
    }

});
