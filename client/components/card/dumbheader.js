const React = require('react');

const DumbCardHeader = React.createClass({

    propTypes: {
        isReviewing: React.PropTypes.bool,
        cardTitle: React.PropTypes.string.isRequired,
        cardID: React.PropTypes.number.isRequired
    },

    getDefaultProps() {

        return {
            isReviewing: false
        };
    },

    getLead() {

        const {cardID, isReviewing} = this.props;

        if(isReviewing) {
            return `Reviewing Card #${cardID}`;
        }

        return `Card #${cardID}`;

    },

    render() {

        const {cardTitle} = this.props;

        return (
            <div>
                <h4 className="m-y-0">
                    <span className="text-muted lead">
                        {this.getLead()}
                    </span>
                    {' '}
                    <span>{cardTitle}</span>
                </h4>
            </div>
        );
    }
});

module.exports = DumbCardHeader;
