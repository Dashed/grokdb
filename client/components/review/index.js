const React = require('react');
const Immutable = require('immutable');
const either = require('react-either');
const invariant = require('invariant');
const TextareaAutosize = require('react-textarea-autosize');
const _ = require('lodash');

const {types: ROUTES} = require('store/routes');

const courier = require('courier');

const MarkdownPreview = require('components/markdownpreview');
const RenderSourceTabs = require('components/rendersourcetabs');
const CardHeader = require('components/card/header');
const CardTabs = require('components/card/tabs');
const ReviewTabBar = require('./tabbar');
const difficulty = require('constants/difficulty');

const Review = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        currentDeckID: React.PropTypes.number.isRequired,
        currentTab: React.PropTypes.oneOf(['Front', 'Back', 'Description', 'Stashes', 'Meta']),
        card: React.PropTypes.instanceOf(Immutable.Map).isRequired
    },

    getInitialState() {
        return {

            isEditing: false,
            disableSave: false,

            difficulty: difficulty.none,

            // hide back-side of card when being reviewed
            reveal: false,

            // new values for card when editing it

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

    resetState() {

        this.setState({

            isEditing: false,
            disableSave: false,

            difficulty: difficulty.none,

            // hide back-side of card when being reviewed
            reveal: false,

            // new values for card when editing it

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

        const deckID = this.props.currentDeckID;
        this.context.store.routes.toDeckReviewCardFront(deckID);
    },

    componentWillMount() {

        // redirect to front side of card if back-side shouldn't be revealed yet
        if(this.getCurrentTab() === 'back' && !this.state.reveal) {
            const deckID = this.props.currentDeckID;
            this.context.store.routes.toDeckReviewCardFront(deckID);
        }

    },

    backToCardsList(event) {
        event.preventDefault();
        event.stopPropagation();

        this.context.store.routes.toLibraryCards();
    },

    onSwitchCurrentTab(tabType) {

        const deckID = this.props.currentDeckID;

        switch(tabType) {

        case 'Front':

            this.context.store.routes.toDeckReviewCardFront(deckID);
            break;

        case 'Back':

            this.context.store.routes.toDeckReviewCardBack(deckID);
            break;

        case 'Description':

            this.context.store.routes.toDeckReviewCardDescription(deckID);
            break;

        case 'Meta':

            this.context.store.routes.toDeckReviewCardMeta(deckID);
            break;

        case 'Stashes':

            this.context.store.routes.toDeckReviewCardStashes(deckID);
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

    getSource(currentTab) {

        // invarant: currentTab is one of front, back, or description

        const newSource = this.state[currentTab].newSource;

        if(_.isString(newSource)) {
            return newSource;
        }

        const {card} = this.props;

        switch(currentTab) {
        case 'front':
        case 'back':
        case 'description':
            break;

        default:
            throw Error(`Unexpected currentTab. Given: ${currentTab}`);
        }

        return card.get(currentTab);

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

    onReveal() {

        const deckID = this.props.currentDeckID;

        this.context.store.routes.toDeckReviewCardBack(deckID);

        this.setState({
            reveal: true
        });

    },

    onNext() {

        const cardID = this.props.card.get('id');

        const currentDifficulty = this.state.difficulty;

        this.context.store.review.reviewCard(cardID, currentDifficulty, false)
            .then(() => {

                this.resetState();

                return this.context.store.review.getNextReviewableCardForDeck();
            });

    },

    onSkip() {

        const cardID = this.props.card.get('id');

        const currentDifficulty = this.state.difficulty;

        this.context.store.review.reviewCard(cardID, currentDifficulty, true)
            .then(() => {

                this.resetState();

                return this.context.store.review.getNextReviewableCardForDeck();
            });

    },

    onChooseDifficulty(difficultyTag) {

        this.setState({
            difficulty: difficultyTag
        });
    },

    render() {

        // bail early
        if(this.getCurrentTab() === 'back' && !this.state.reveal) {
            return null;
        }

        const {card} = this.props;

        return (
            <div>
                <div className="row">
                    <div className="col-sm-12 m-y">
                        <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={this.backToCardsList}
                        >
                            {'Stop Reviewing Deck'}
                        </button>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <CardHeader cardID={card.get('id')} />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <CardTabs
                            hideBack={!this.state.reveal}
                            currentTab={this.props.currentTab}
                            onSwitch={this.onSwitchCurrentTab} />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        {this.getChildComponent()}
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <hr />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <ReviewTabBar
                            reveal={this.state.reveal}
                            difficulty={this.state.difficulty}
                            onReveal={this.onReveal}
                            onNext={this.onNext}
                            onSkip={this.onSkip}
                            onChooseDifficulty={this.onChooseDifficulty}
                        />
                    </div>
                </div>
            </div>
        );
    }
});

const NoReview = React.createClass({

    render() {
        return (
            <div>
                {'deck has no card to review'}
            </div>
        );
    }
});

const eitherReview = either(Review, NoReview, function(props) {

    // if props.card is not Immutable.Map, then there is no reviewable card for this deck

    return Immutable.Map.isMap(props.card);
});

module.exports = courier({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    component: eitherReview,
    onlyWaitingOnMount: true,

    watch(props, manual, context) {
        return [
            context.store.routes.watchRoute(),
            context.store.review.watchCardOfCurrentDeck()
        ];
    },

    assignNewProps: function(props, context) {

        // console.log(context.store.routes.route());

        // fetch reviewable card for deck
        return context.store.review.getReviewableCardForDeck()
            .then(function(card) {

                const route = context.store.routes.route();

                let currentTab;

                switch(route) {

                case ROUTES.REVIEW.VIEW.FRONT:

                    currentTab = 'Front';
                    break;

                case ROUTES.REVIEW.VIEW.BACK:

                    currentTab = 'Back';
                    break;

                case ROUTES.REVIEW.VIEW.DESCRIPTION:

                    currentTab = 'Description';
                    break;

                case ROUTES.REVIEW.VIEW.META:

                    currentTab = 'Meta';
                    break;

                case ROUTES.REVIEW.VIEW.STASHES:

                    currentTab = 'Stashes';
                    break;

                default:
                    invariant(false, `Unexpected route. Given: ${String(this.props.route)}`);
                }

                const currentDeckID = context.store.decks.currentID();

                return {
                    card: card,
                    currentTab: currentTab,
                    currentDeckID: currentDeckID
                };

            });

    }

});
