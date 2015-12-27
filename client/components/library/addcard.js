const React = require('react');

const AddCard = React.createClass({

    propTypes: {
        // Handler: React.PropTypes.oneOfType([ React.PropTypes.func, React.PropTypes.string ])
    },

    render() {

        return (
            <div>
                {'add card'}
            </div>
        );
    }
});

module.exports = AddCard;
