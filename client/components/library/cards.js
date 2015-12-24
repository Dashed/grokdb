const React = require('react');

const courier = require('courier');


const CardsList = React.createClass({
    render() {
        return (
            <div>
                {'cards list'}
            </div>
        );
    }
});


module.exports = courier({
    component: CardsList,

});
