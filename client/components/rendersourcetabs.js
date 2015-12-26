const React = require('react');
const classnames = require('classnames');


const RenderSourceTabs = React.createClass({

    getDefaultProps() {
        return {
            isEditing: false,
            showRender: true
        };
    },

    propTypes: {
        onSwitch: React.PropTypes.func.isRequired,
        showRender: React.PropTypes.bool,
        isEditing: React.PropTypes.bool,
    },

    onSwitchTab(tabType) {

        switch(tabType) {
        case 'render':
        case 'source':
            break;
        default:
            throw Error(`Unexpected tabType. Given: ${tabType}`);
        };

        return (event) => {
            event.preventDefault();
            event.stopPropagation();

            const {onSwitch} = this.props;

            onSwitch.call(null, tabType);
        };

    },

    render() {

        const {showRender} = this.props;

        return (
            <ul className="nav nav-pills m-b" style={{fontSize: '0.8rem'}}>
                <li className="nav-item">
                    <a
                        className={classnames('nav-link', {'active': showRender})}
                        onClick={this.onSwitchTab('render')}
                        href="#">
                        {'Render'}
                    </a>
                </li>
                <li className="nav-item">
                    <a
                        className={classnames('nav-link', {'active': !showRender})}
                        onClick={this.onSwitchTab('source')}
                        href="#">
                        {'Source'}
                    </a>
                </li>
            </ul>
        );
    }
});

module.exports = RenderSourceTabs;
