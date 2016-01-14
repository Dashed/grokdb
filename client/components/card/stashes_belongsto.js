const React = require('react');
const _ = require('lodash');

const courier = require('courier');
const StashListItem = require('./stashlistitem');

const StashesBelongsToPagination = require('./stashes_belongsto_pagination');

const StashesBelongsTo = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        cardID: React.PropTypes.number.isRequired,
        stashesByID: React.PropTypes.array.isRequired
    },

    onClickPage(requestedPageNum) {
        this.context.store.stashes.pageOfCardBelongsTo(requestedPageNum);
        this.context.store.commit();
    },

    render() {

        const stashesByID = this.props.stashesByID;

        if(stashesByID.length <= 0) {
            return (
                <div className="card">
                    <div className="card-block text-center">
                        <p className="card-text text-muted">
                            {'This card does not belong in any stashes. To get started, assign this card to a stash.'}
                        </p>
                    </div>
                </div>
            );
        }

        const {cardID} = this.props;

        const items = _.map(stashesByID, (stashID, index) => {

            const key = '' + stashID + index;

            return (
                <StashListItem
                    key={key}
                    stashID={stashID}
                    shouldShadeHasCard={false}
                    cardID={cardID}
                />
            );
        });

        return (
            <div>
                <div className="row m-b">
                    <div className="col-sm-12">
                        <ul className="list-group">
                            {items}
                        </ul>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <StashesBelongsToPagination
                            cardID={cardID}
                            onClickPage={this.onClickPage}
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

    propTypes: {
        cardID: React.PropTypes.number.isRequired
    },

    component: StashesBelongsTo,

    watch(props, manual, context) {

        return [
            context.store.stashes.watchPageOfCardBelongsTo(),
            context.store.stashes.watchOrderOfCardBelongsTo(),
            context.store.stashes.watchSortOfCardBelongsTo()
        ];
    },

    assignNewProps: function(props, context) {

        const {cardID} = props;

        return context.store.stashes.listOfCardBelongsTo(cardID)
            .then((stashesByID) => {

                return {
                    stashesByID
                };

            });
    }
});
