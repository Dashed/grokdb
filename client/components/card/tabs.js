const React = require('react');
const classnames = require('classnames');

const FRONT = 'Front';
const BACK = 'Back';
const DESCRIPTION = 'Description';
const STASHES = 'Stashes';
const META = 'Meta';

const CardTabs = React.createClass({

    propTypes: {
        onSwitch: React.PropTypes.func.isRequired,
        currentTab: React.PropTypes.oneOf([FRONT, BACK, DESCRIPTION, STASHES, META]),
        hideBack: React.PropTypes.bool.isRequired
    },

    getDefaultProps() {

        return {
            currentTab: FRONT,
            hideBack: false
        };
    },

    getStyle(currentTab) {

        return classnames('nav-link', {
            active: currentTab == this.props.currentTab
        });

    },

    onSwitchTab(tabType) {

        return (event) => {
            event.preventDefault();
            event.stopPropagation();

            if(tabType == this.props.currentTab) {
                return;
            }

            const {onSwitch} = this.props;

            onSwitch.call(null, tabType);
        };

    },

    getBack() {

        if(this.props.hideBack) {
            return null;
        }

        return (
            <li className="nav-item">
                <a
                    className={this.getStyle(BACK)}
                    onClick={this.onSwitchTab(BACK)}
                    href="#">
                    {BACK}
                </a>
            </li>
        );

    },

    render() {
        return (
            <ul className="nav nav-tabs">
                <li className="nav-item">
                    <a
                        className={this.getStyle(FRONT)}
                        onClick={this.onSwitchTab(FRONT)}
                        href="#">
                        {FRONT}
                    </a>
                </li>
                {this.getBack()}
                <li className="nav-item">
                    <a
                        className={this.getStyle(DESCRIPTION)}
                        onClick={this.onSwitchTab(DESCRIPTION)}
                        href="#">
                        {DESCRIPTION}
                    </a>
                </li>
                <li className="nav-item">
                    <a
                        className={this.getStyle(STASHES)}
                        onClick={this.onSwitchTab(STASHES)}
                        href="#">
                        {STASHES}
                    </a>
                </li>
                <li className="nav-item">
                    <a
                        className={this.getStyle(META)}
                        onClick={this.onSwitchTab(META)}
                        href="#">
                        {META}
                    </a>
                </li>
            </ul>
        );
    }

});

module.exports = CardTabs;
