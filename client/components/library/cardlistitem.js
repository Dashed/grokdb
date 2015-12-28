const React = require('react');
const Immutable = require('immutable');

const courier = require('courier');

const CardListItem = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        cardID: React.PropTypes.number.isRequired,
        card: React.PropTypes.instanceOf(Immutable.Map).isRequired
    },

    onClick(event) {
        event.preventDefault();
        event.stopPropagation();

        console.log('click');

        // this.context.store.routes.toCard(this.props.cardID);
    },

    render() {

        const {card} = this.props;

        return (
            <li className="list-group-item">
                <a href="#" onClick={this.onClick} >
                    {card.get('title')}
                </a>
            </li>
        );
    }

});

module.exports = courier({

    component: CardListItem,

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    shouldRewatch(props) {

        const oldCardID = this.currentProps.cardID;
        const newCardID = props.cardID;

        return oldCardID != newCardID;
    },

    watch(props, manual, context) {

        const cardID = props.cardID;

        return context.store.cards.observable(cardID);
    },

    assignNewProps: function(props, context) {

        const cardID = props.cardID;

        return context.store.cards.get(cardID)
            .then(function(card) {
                return {
                    card: card
                };
            });
    }
});
