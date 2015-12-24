const React = require('react');

const courier = require('courier');


const DecksList = React.createClass({
    render() {
        return (
            <div>
                {'decks list'}
            </div>
        );
    }
});


module.exports = courier({
    component: DecksList,

});
