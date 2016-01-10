const React = require('react');
const _ = require('lodash');
const shallowEqual = require('shallowequal');

const courier = require('courier');

const {perPage} = require('constants/cardspagination');

const WaitingCardListItem = require('components/card/waitingcardlistitem');
const CardListItem = require('./cardlistitem');
const CardsPagination = require('./cardspagination');

const DumbCardsList = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        cardIDs: React.PropTypes.array.isRequired
    },

    cardsList() {

        const cardIDs = this.props.cardIDs;

        if(cardIDs.length <= 0) {
            return (
                <div className="card">
                    <div className="card-block text-center">
                        <p className="card-text text-muted">
                            {'No cards to display. To get started, you should add a card to this stash.'}
                        </p>
                    </div>
                </div>
            );
        }

        const items = _.map(cardIDs, (cardID, index) => {

            const key = '' + cardID + index;

            return (
                <CardListItem key={key} cardID={cardID} />
            );

        });

        return (
            <ul className="list-group">
                {items}
            </ul>
        );

    },

    onClickPage(requestedPageNum) {
        this.context.store.routes.toStashCards(void 0, void 0, void 0, requestedPageNum);
    },

    render() {
        return (
            <div>
                <div className="row m-b">
                    <div className="col-sm-12">
                        {this.cardsList()}
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <CardsPagination
                            onClickPage={this.onClickPage}
                        />
                    </div>
                </div>
            </div>
        );
    }
});

const WaitingDumbCardsList = React.createClass({

    cardsList() {

        let items = [];

        let n = perPage;

        while(n-- > 0) {
            items.push(
                <WaitingCardListItem key={n} />
            );
        }

        return (
            <ul className="list-group">
                {items}
            </ul>
        );
    },

    render() {
        return (
            <div className="row">
                <div className="col-sm-12">
                    {this.cardsList()}
                </div>
            </div>
        );
    }

});

module.exports = courier({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    component: DumbCardsList,
    waitingComponent: WaitingDumbCardsList,

    onlyWaitingOnMount: true,

    watch(props, manual, context) {
        return [
            context.store.cards.watchPageOfStash(),
            context.store.stashes.watchCurrentID(),
            context.store.cards.watchOrderOfStash(),
            context.store.cards.watchSortOfStash()
        ];
    },

    shouldComponentUpdate(nextProps) {
        // don't reload cards list when cardIDs are the same.
        // when a new page is requested, wrapped component may be pinged to
        // re-render on same cardIDs as new page resolves.
        return !shallowEqual(nextProps.cardIDs, this.props.cardIDs);
    },

    assignNewProps: function(props, context) {

        const stashID = context.store.stashes.currentID();

        return context.store.cards.currentCardsIDByStash(stashID)
            .then((cardIDs) => {

                return {
                    cardIDs: cardIDs
                };

            });
    }

});
