const React = require('react');
const Immutable = require('immutable');
const invariant = require('invariant');

const {types: ROUTES} = require('store/routes');

const courier = require('courier');

const {tabs} = require('constants/cardprofile');

const CardDetail = require('components/card/index');
const StashHeader = require('./header');

// /stash/:stash_id/card/:card_id
const CardProfile = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        currentStashID: React.PropTypes.number.isRequired,
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
        this.context.store.routes.toStashCards();
    },

    onSwitchCurrentTab(tabType) {

        const cardID = this.props.currentCard.get('id');
        const stashID = this.props.currentStashID;

        switch(tabType) {

        case tabs.front:

            this.context.store.routes.toStashCardFront(cardID, stashID);
            break;

        case tabs.back:

            this.context.store.routes.toStashCardBack(cardID, stashID);
            break;

        case tabs.description:

            this.context.store.routes.toStashCardDescription(cardID, stashID);
            break;

        case tabs.meta:

            this.context.store.routes.toStashCardMeta(cardID, stashID);
            break;

        case tabs.stashes:

            this.context.store.routes.toStashCardStashes(cardID, stashID);
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

    render() {

        return (
            <div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <StashHeader stashID={this.props.currentStashID} />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <CardDetail
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
                        />
                    </div>
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

                case ROUTES.STASHES.CARD.VIEW.FRONT:

                    currentTab = tabs.front;
                    break;

                case ROUTES.STASHES.CARD.VIEW.BACK:

                    currentTab = tabs.back;
                    break;

                case ROUTES.STASHES.CARD.VIEW.DESCRIPTION:

                    currentTab = tabs.description;
                    break;

                case ROUTES.STASHES.CARD.VIEW.META:

                    currentTab = tabs.meta;
                    break;

                case ROUTES.STASHES.CARD.VIEW.STASHES:

                    currentTab = tabs.stashes;
                    break;

                default:
                    invariant(false, `Unexpected route. Given: ${String(route)}`);
                }

                const currentStashID = context.store.stashes.currentID();

                return {
                    currentStashID: currentStashID,
                    currentCard: currentCard,
                    currentTab
                };
            });
    }

});
