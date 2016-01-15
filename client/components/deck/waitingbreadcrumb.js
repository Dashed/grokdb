const React = require('react');

// this is a placeholder component on initial load/mount to occupy the space
// that the component will cover in order to prevent any inducement of jank.
const BreadcrumbWaiting = React.createClass({
    render() {
        return (
            <ol className="breadcrumb m-y-0">
                <li className="active" style={{color: '#eceeef'}}>
                    {'.'}
                </li>
            </ol>
        );
    }
});

module.exports = BreadcrumbWaiting;
