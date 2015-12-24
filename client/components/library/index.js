const React = require('react');

const Breadcrumb = require('./breadcrumb');
const Header = require('./header');
const Subnav = require('./subnav');
const LibraryDetail = require('./detail');

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
                        <Header />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <Subnav />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <LibraryDetail />
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = Library;
