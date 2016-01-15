const React = require('react');
const Immutable = require('immutable');
const invariant = require('invariant');

const {types: ROUTES} = require('store/routes');

const courier = require('courier');

const {tabs} = require('constants/cardprofile');

const CardDetail = require('components/card/index');

// /deck/:deck_id/card/:card_id
const CardProfile = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        currentDeckID: React.PropTypes.number.isRequired,
        currentTab: React.PropTypes.oneOf([tabs.front, tabs.back, tabs.description, tabs.stashes, tabs.meta]),
        currentCard: React.PropTypes.instanceOf(Immutable.Map).isRequired
    },

    getInitialState() {
        return {

            isEditing: false,
            disableSave: false
        };
    },

    componentWillMount() {
        this.context.store.stashes.pageAll(1);
        this.context.store.stashes.pageOfCardBelongsTo(1);
    },

    onClickBackButton() {
        this.context.store.routes.toLibraryCards();
    },

    onSwitchCurrentTab(tabType) {

        const cardID = this.props.currentCard.get('id');
        const deckID = this.props.currentDeckID;

        switch(tabType) {

        case tabs.front:

            this.context.store.routes.toCardFront(cardID, deckID);
            break;

        case tabs.back:

            this.context.store.routes.toCardBack(cardID, deckID);
            break;

        case tabs.description:

            this.context.store.routes.toCardDescription(cardID, deckID);
            break;

        case tabs.meta:

            this.context.store.routes.toCardMeta(cardID, deckID);
            break;

        case tabs.stashes:

            this.context.store.routes.toCardStashes(cardID, deckID);
            break;

        default:
            invariant(false, `Unexpected tabType. Given: ${String(tabType)}`);

        }

    },

    onCardSave(patch) {

        this.setState({
            isEditing: false
        });

        this.context.store.cards.patchCurrent(patch);
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

    onReview() {

        const deckID = this.props.currentDeckID;
        const cardID = this.props.currentCard.get('id');

        this.context.store.routes.toCardReview(cardID, deckID);
    },

    onDelete() {

        const deckID = this.props.currentDeckID;
        this.context.store.routes.toLibraryCards(deckID);
    },

    render() {

        return (
            <div className="row">
                <div className="col-sm-12">
                    <CardDetail

                        showReviewButton

                        currentTab={this.props.currentTab}
                        currentCard={this.props.currentCard}

                        isEditing={this.state.isEditing}
                        disableSave={this.state.disableSave}

                        backButtonLabel="Back to cards list"
                        onClickBackButton={this.onClickBackButton}

                        onSwitchCurrentTab={this.onSwitchCurrentTab}

                        onCardSave={this.onCardSave}
                        editCard={this.editCard}
                        onCancelEdit={this.onCancelEdit}

                        onReview={this.onReview}
                        onDelete={this.onDelete}
                    />
                </div>
            </div>
        );

    }
});


module.exports = courier({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    component: CardProfile,

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

                    currentTab = tabs.front;
                    break;

                case ROUTES.CARD.VIEW.BACK:

                    currentTab = tabs.back;
                    break;

                case ROUTES.CARD.VIEW.DESCRIPTION:

                    currentTab = tabs.description;
                    break;

                case ROUTES.CARD.VIEW.META:

                    currentTab = tabs.meta;
                    break;

                case ROUTES.CARD.VIEW.STASHES:

                    currentTab = tabs.stashes;
                    break;

                default:
                    invariant(false, `Unexpected route. Given: ${String(route)}`);
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
