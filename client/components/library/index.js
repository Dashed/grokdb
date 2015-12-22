const React = require('react');

const Breadcrumb = require('./breadcrumb');

const Library = React.createClass({
    render() {
        return (
            <div>
                <div className="row">
                    <div className="col-sm-12">
                        <Breadcrumb />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        {'library'}
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = Library;
