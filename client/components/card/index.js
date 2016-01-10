const React = require('react');
const Immutable = require('immutable');
const _ = require('lodash');
const invariant = require('invariant');
const TextareaAutosize = require('react-textarea-autosize');
const classnames = require('classnames');

const {tabs} = require('constants/cardprofile');

const RenderSourceTabs = require('components/rendersourcetabs');
const MarkdownPreview = require('components/markdownpreview');

const CardHeader = require('./header');
const CardTabs = require('./tabs');
const CardStashes = require('./stashes');

const DumbCardDetail = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        currentTab: React.PropTypes.oneOf([tabs.front, tabs.back, tabs.description, tabs.stashes, tabs.meta]),
        currentCard: React.PropTypes.instanceOf(Immutable.Map).isRequired,

        isEditing: React.PropTypes.bool.isRequired,
        disableSave: React.PropTypes.bool.isRequired,

        backButtonLabel: React.PropTypes.string.isRequired,
        onClickBackButton: React.PropTypes.func.isRequired,

        onSwitchCurrentTab: React.PropTypes.func.isRequired,

        onCardSave: React.PropTypes.func.isRequired,
        editCard: React.PropTypes.func.isRequired,
        onCancelEdit: React.PropTypes.func.isRequired,

        // cosmetic flags
        isReviewing: React.PropTypes.bool.isRequired,
        hideBack: React.PropTypes.bool.isRequired,
        hideEdit: React.PropTypes.bool.isRequired
    },

    getDefaultProps() {

        return {
            isReviewing: false,
            hideBack: false,
            hideEdit: false
        };
    },

    getInitialState() {
        return {

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

    onClickBackButton(event) {
        event.preventDefault();
        event.stopPropagation();

        this.props.onClickBackButton.call(void 0);
    },

    onSwitchCurrentTab(tabType) {

        // validation
        switch(tabType) {

        case tabs.front:
        case tabs.back:
        case tabs.description:
        case tabs.meta:
        case tabs.stashes:
            break;

        default:
            invariant(false, `Unexpected tabType. Given: ${String(tabType)}`);

        }

        this.props.onSwitchCurrentTab.call(void 0, tabType);

    },

    getCurrentTab() {

        let key = 'front';

        switch(this.props.currentTab) {

        case tabs.front:
            key = 'front';
            break;

        case tabs.back:
            key = 'back';
            break;

        case tabs.description:
            key = 'description';
            break;

        case tabs.stashes:
            key = 'stashes';
            break;

        case tabs.meta:
            key = 'meta';
            break;

        default:
            throw Error(`Unexpected currentTab value. Given: ${String(this.props.currentTab)}`);
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
        case 'back':
        case 'description':
            break;

        default:
            throw Error(`Unexpected currentTab. Given: ${currentTab}`);
        }

        return currentCard.get(currentTab);

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

            if(!this.props.isEditing) {
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
                readOnly={!this.props.isEditing}
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
                            <CardStashes
                                cardID={this.props.currentCard.get('id')}
                            />
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

        this.props.editCard.call(void 0);

    },

    onCancelEdit(event) {
        event.preventDefault();
        event.stopPropagation();

        this.props.onCancelEdit.call(void 0);

    },

    getEditCancelButton() {

        if(this.props.hideEdit) {
            return null;
        }

        if(!this.props.isEditing) {

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

        const titleSource = this.getTitleSource();

        if(_.isString(titleSource) && titleSource.length > 0) {
            return true;
        }

        return false;
    },

    onCardSave(event) {
        event.preventDefault();
        event.stopPropagation();

        if(!this.shouldSaveCard()) {
            return;
        }

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

        this.setState(_.assign({}, this.state, {

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

        this.props.onCardSave.call(void 0, patch);
    },

    getSaveComponent() {

        if(!this.props.isEditing) {
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

    toReviewCard() {
        event.preventDefault();
        event.stopPropagation();

        // TODO: implement
        console.log('implement');
    },

    componentWillReceiveProps(nextProps) {

        if(nextProps.isEditing && !this.props.isEditing) {

            this.setState({

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

        } else if(!nextProps.isEditing && this.props.isEditing) {

            this.setState({

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

        }

    },

    render() {
        return (
            <div>
                <div className="row">
                    <div className="col-sm-12 m-y">
                        <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={this.onClickBackButton}
                        >{this.props.backButtonLabel}</button>
                        {this.getEditCancelButton()}
                        <button
                            type="button"
                            className="btn btn-sm btn-primary-outline pull-right m-r"
                            onClick={this.toReviewCard}
                        >{'Review this Card'}</button>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        {(function() {

                            if(this.props.isEditing) {
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

                            return (
                                <CardHeader
                                    isReviewing={this.props.isReviewing}
                                    cardID={this.props.currentCard.get('id')}
                                />
                            );

                        }).call(this)}
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <CardTabs
                            hideBack={this.props.hideBack}
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

module.exports = DumbCardDetail;
