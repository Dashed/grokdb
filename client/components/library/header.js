const React = require('react');

const Header = React.createClass({
    render() {
        return (
            <div>
                <h4 className="m-y">
                    <span className="text-muted lead">{'#1'}</span>
                    {' '}
                    <span>{'deck title'}</span>
                </h4>
            </div>
        );
    }
});

module.exports = Header;
