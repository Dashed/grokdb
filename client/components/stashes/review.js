const React = require('react');
const Immutable = require('immutable');
const either = require('react-either');
const invariant = require('invariant');

const {types: ROUTES} = require('store/routes');
const {ReviewPatch} = require('store/review');

const courier = require('courier');

const {tabs} = require('constants/cardprofile');

const CardDetail = require('components/card/index');
const ReviewTabBar = require('components/review/tabbar');
const difficulty = require('constants/difficulty');

const StashHeader = require('./header');

const Review = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        currentStashID: React.PropTypes.number.isRequired,
        currentTab: React.PropTypes.oneOf([tabs.front, tabs.back, tabs.description, tabs.stashes, tabs.meta]),
        card: React.PropTypes.instanceOf(Immutable.Map).isRequired
    },

    getInitialState() {
        return {

            isEditing: false,
            disableSave: false,

            difficulty: difficulty.none,

            // hide back-side of card when being reviewed
            reveal: false
        };
    },

    resetState() {

        this.setState({

            isEditing: false,
            disableSave: false,

            difficulty: difficulty.none,

            // hide back-side of card when being reviewed
            reveal: false
        });

        const stashID = this.props.currentStashID;
        this.context.store.routes.toStashReviewCardFront(stashID);
    },

    componentWillMount() {

        // redirect to front side of card if back-side shouldn't be revealed yet
        if(this.props.currentTab === tabs.back && !this.state.reveal) {

            const stashID = this.props.currentStashID;
            this.context.store.routes.toStashReviewCardFront(stashID);
        }

    },

    onClickBackButton() {
        this.context.store.routes.toStashCards();
    },

    onSwitchCurrentTab(tabType) {

        const stashID = this.props.currentStashID;

        switch(tabType) {

        case tabs.front:

            this.context.store.routes.toStashReviewCardFront(stashID);
            break;

        case tabs.back:

            this.context.store.routes.toStashReviewCardBack(stashID);
            break;

        case tabs.description:

            this.context.store.routes.toStashReviewCardDescription(stashID);
            break;

        case tabs.meta:

            this.context.store.routes.toStashReviewCardMeta(stashID);
            break;

        // note: Stashes is not supported

        default:
            invariant(false, `Unexpected tabType. Given: ${String(tabType)}`);

        }
    },

    onCardSave(patch) {

        this.setState({
            isEditing: false
        });

        const cardID = this.props.card.get('id');

        this.context.store.cards.patch(cardID, patch);
    },

    editCard() {

        this.setState({
            isEditing: true
        });

    },

    onCancelEdit() {

        this.setState({
            isEditing: false
        });

    },

    onDeleteCard() {

        const stashID = this.props.currentStashID;
        this.context.store.routes.toStashCards(stashID);
    },

    onReveal() {

        const stashID = this.props.currentStashID;

        this.context.store.routes.toStashReviewCardBack(stashID);

        this.setState({
            reveal: true
        });

    },

    onNext() {

        const {currentStashID} = this.props;

        const cardID = this.props.card.get('id');

        const currentDifficulty = this.state.difficulty;

        const patch = new ReviewPatch(cardID);

        patch.difficulty(currentDifficulty);
        patch.skipCard(false);
        patch.stash(currentStashID);

        this.context.store.review.reviewCard(patch)
            .then(() => {

                this.resetState();

                return this.context.store.review.getNextReviewableCardForStash();
            });

    },

    onSkip() {

        const {currentStashID} = this.props;

        const cardID = this.props.card.get('id');

        const currentDifficulty = this.state.difficulty;

        const patch = new ReviewPatch(cardID);

        patch.difficulty(currentDifficulty);
        patch.skipCard(true);
        patch.stash(currentStashID);

        this.context.store.review.reviewCard(patch)
            .then(() => {

                this.resetState();

                return this.context.store.review.getNextReviewableCardForStash();
            });

    },

    onChooseDifficulty(difficultyTag) {

        this.setState({
            difficulty: difficultyTag
        });
    },

    render() {

        // bail early
        if(this.props.currentTab === tabs.back && !this.state.reveal) {
            return null;
        }

        const {currentStashID} = this.props;

        return (
            <div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <StashHeader isReviewing stashID={currentStashID} />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <CardDetail

                            isReviewing
                            hideBack={!this.state.reveal}
                            hideEdit={!this.state.reveal}
                            hideStashes

                            currentTab={this.props.currentTab}
                            currentCard={this.props.card}

                            isEditing={this.state.isEditing}
                            disableSave={this.state.disableSave}

                            backButtonLabel="Stop Reviewing Stash"
                            onClickBackButton={this.onClickBackButton}

                            onSwitchCurrentTab={this.onSwitchCurrentTab}

                            onCardSave={this.onCardSave}
                            editCard={this.editCard}
                            onCancelEdit={this.onCancelEdit}
                            onDelete={this.onDeleteCard}
                        />
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

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        currentStashID: React.PropTypes.number.isRequired
    },

    onClickBackButton(event) {
        event.preventDefault();
        event.stopPropagation();

        this.context.store.routes.toStashCards();
    },

    render() {
        return (
            <div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <StashHeader isReviewing stashID={this.props.currentStashID} />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={this.onClickBackButton}
                        >
                            {'Stop Reviewing Stash'}
                        </button>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <div className="card">
                            <div className="card-block text-center">
                                <p className="card-text text-muted">
                                    {'This stash does not have any cards for review.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

const eitherReview = either(Review, NoReview, function(props) {

    // if props.card is not Immutable.Map, then there is no reviewable card for this stash

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
            context.store.review.watchCardOfCurrentStash()
        ];
    },

    assignNewProps: function(props, context) {

        // fetch reviewable card for stash
        return context.store.review.getReviewableCardForStash()
            .then(function(card) {

                const route = context.store.routes.route();

                let currentTab;

                switch(route) {

                case ROUTES.STASHES.REVIEW.VIEW.FRONT:

                    currentTab = tabs.front;
                    break;

                case ROUTES.STASHES.REVIEW.VIEW.BACK:

                    currentTab = tabs.back;
                    break;

                case ROUTES.STASHES.REVIEW.VIEW.DESCRIPTION:

                    currentTab = tabs.description;
                    break;

                case ROUTES.STASHES.REVIEW.VIEW.META:

                    currentTab = tabs.meta;
                    break;

                // note: stashes is not supported

                default:
                    invariant(false, `Unexpected route. Given: ${String(this.props.route)}`);
                }

                const currentStashID = context.store.stashes.currentID();

                return {
                    card: card,
                    currentTab: currentTab,
                    currentStashID: currentStashID
                };

            });

    }

});
