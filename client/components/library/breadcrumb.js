const React = require('react');

const Breadcrumb = React.createClass({
    render() {
        return (
        <div>
            <ol className="breadcrumb m-y-0">
                <li><a href="#">Home</a></li>
                <li><a href="#">Library</a></li>
                <li className="active">Data</li>
            </ol>
        </div>);
    }
});

module.exports = Breadcrumb;
