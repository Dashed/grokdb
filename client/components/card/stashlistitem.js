/**
 * Custom for card/stashes
 */

const React = require('react');
const Immutable = require('immutable');
const classnames = require('classnames');

const courier = require('courier');

const StashListItem = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        stashID: React.PropTypes.number.isRequired,
        cardID: React.PropTypes.number.isRequired,
        hasCard: React.PropTypes.bool.isRequired,
        shouldShadeHasCard: React.PropTypes.bool.isRequired,
        stash: React.PropTypes.instanceOf(Immutable.Map).isRequired
    },

    getDefaultProps() {

        return {
            shouldShadeHasCard: true
        };

    },

    toggleRelationship(event) {
        event.preventDefault();
        event.stopPropagation();

        const {stashID, cardID, hasCard} = this.props;

        this.context.store.stashes.toggleRelationship(stashID, cardID, !hasCard);
    },

    toStash(event) {
        event.preventDefault();
        event.stopPropagation();

        this.context.store.routes.toStash(this.props.stashID);
    },

    getButton() {

        const {hasCard} = this.props;

        return (
            <button
                type="button"
                onClick={this.toggleRelationship}
                className={classnames('btn', 'btn-sm', 'pull-right', {
                    'btn-success': !hasCard,
                    'btn-danger': hasCard
                })}>
                { hasCard ? 'Remove' : 'Add' }
            </button>
        );

    },

    render() {

        const {stash, hasCard, shouldShadeHasCard} = this.props;

        const activeStyle = {
            'list-group-item-info': shouldShadeHasCard && hasCard
        };

        return (
            <li className={classnames('list-group-item', activeStyle)}>
                {this.getButton()}
                <h6 className="list-group-item-heading m-y-0">
                    <a href="#" onClick={this.toStash}>
                        {stash.get('name')}
                    </a>
                </h6>
                <p className="list-group-item-text m-y-0">
                    <small className="text-muted">
                        {`Stash #${stash.get('id')}`}
                    </small>
                </p>
            </li>
        );
    }
});

module.exports = courier({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        stashID: React.PropTypes.number.isRequired,
        cardID: React.PropTypes.number.isRequired
    },

    component: StashListItem,

    shouldRewatch(props) {

        const oldStashID = this.currentProps.stashID;
        const newStashID = props.stashID;

        const oldCardID = this.currentProps.cardID;
        const newCardID = props.cardID;

        return (oldStashID != newStashID || oldCardID != newCardID);
    },

    watch(props, manual, context) {

        const stashID = props.stashID;
        const cardID = props.cardID;

        return [
            context.store.stashes.observable(stashID),
            context.store.stashes.watchStashCardRelationship(stashID, cardID)
        ];
    },

    assignNewProps: function(props, context) {

        const stashID = props.stashID;
        const cardID = props.cardID;

        return context.store.stashes.get(stashID)
            .then(function(stash) {

                const hasCard = context.store.stashes.stashHasCard(stashID, cardID);

                return {
                    stash,
                    hasCard
                };
            });
    }

});
