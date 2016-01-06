const React = require('react');
const _ = require('lodash');

const courier = require('courier');

const StashListItem = require('./listitem');

const StashesList = React.createClass({

    propTypes: {
        stashesByID: React.PropTypes.array.isRequired
    },

    render() {

        const stashesByID = this.props.stashesByID;

        if(stashesByID.length <= 0) {
            return (
                <div className="card">
                    <div className="card-block text-center">
                        <p className="card-text text-muted">
                            {'No stashes to display. To get started, you should create your stash.'}
                        </p>
                    </div>
                </div>
            );
        }

        const items = _.map(stashesByID, (stashID, index) => {

            const key = '' + stashID + index;

            return (
                <StashListItem key={key} stashID={stashID} />
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

    component: StashesList,

    watch(props, manual, context) {
        return [
            context.store.stashes.watchPage(),
            context.store.stashes.watchOrder(),
            context.store.stashes.watchSort()
        ];
    },

    assignNewProps: function(props, context) {

        return context.store.stashes.list()
            .then((stashesByID) => {

                return {
                    stashesByID: stashesByID
                };

            });

    }
});
