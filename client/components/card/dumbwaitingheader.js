const React = require('react');

const DumbWaitingCardHeader = React.createClass({

    render() {

        return (
            <div>
                <h4>
                    <span className="text-muted lead">{`Card #`}</span>
                    {' '}
                    <span style={{color: '#ffffff'}}>{'loading'}</span>
                </h4>
            </div>
        );
    }
});

module.exports = DumbWaitingCardHeader;
