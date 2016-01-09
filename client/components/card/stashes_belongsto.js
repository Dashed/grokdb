const React = require('react');
const _ = require('lodash');

const courier = require('courier');
const StashListItem = require('./stashlistitem');


const StashesBelongsTo = React.createClass({

    propTypes: {
        cardID: React.PropTypes.number.isRequired,
        stashesByID: React.PropTypes.array.isRequired
    },

    render() {

        const stashesByID = this.props.stashesByID;

        if(stashesByID.length <= 0) {
            return (
                <div className="card">
                    <div className="card-block text-center">
                        <p className="card-text text-muted">
                            {'No stashes to display. To get started, you should create your first stash.'}
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
            <ul className="list-group">
                {items}
            </ul>
        );
    }

});

module.exports = courier({

    contextTypes: {
        store: React.PropTypes.object.isRequired
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

        return context.store.stashes.listOfCardBelongsTo(props.cardID)
            .then((stashesByID) => {

                return {
                    stashesByID
                };

            });
    }
});
