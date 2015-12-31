const React = require('react');

const DumbCardHeader = React.createClass({

    propTypes: {
        cardTitle: React.PropTypes.string.isRequired,
        cardID: React.PropTypes.number.isRequired
    },

    render() {

        const {cardID, cardTitle} = this.props;

        return (
            <div>
                <h4 className="m-y-0">
                    <span className="text-muted lead">{`Card #${cardID}`}</span>
                    {' '}
                    <span>{cardTitle}</span>
                </h4>
            </div>
        );
    }
});

module.exports = DumbCardHeader;
