const React = require('react');

const STYLE = {
    color: '#ffffff'
};

const DumbWaitingCardHeader = React.createClass({

    render() {

        return (
            <div>
                <h4 className="m-y-0">
                    <span className="text-muted lead">{`Card #`}</span>
                    {' '}
                    <span style={STYLE}>{'loading'}</span>
                </h4>
            </div>
        );
    }
});

module.exports = DumbWaitingCardHeader;
