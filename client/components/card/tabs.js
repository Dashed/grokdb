const React = require('react');
const classnames = require('classnames');

const {tabs} = require('constants/cardprofile');

const CardTabs = React.createClass({

    propTypes: {
        onSwitch: React.PropTypes.func.isRequired,
        currentTab: React.PropTypes.oneOf([tabs.front, tabs.back, tabs.description, tabs.stashes, tabs.meta]),

        // cosmetic flasg
        hideBack: React.PropTypes.bool.isRequired,
        hideStashes: React.PropTypes.bool.isRequired
    },

    getDefaultProps() {

        return {
            currentTab: tabs.front,
            hideBack: false,
            hideStashes: false
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
                    className={this.getStyle(tabs.back)}
                    onClick={this.onSwitchTab(tabs.back)}
                    href="#">
                    {'Back'}
                </a>
            </li>
        );

    },

    getStashes() {

        if(this.props.hideStashes) {
            return null;
        }

        return (
            <li className="nav-item">
                <a
                    className={this.getStyle(tabs.stashes)}
                    onClick={this.onSwitchTab(tabs.stashes)}
                    href="#">
                    {'Stashes'}
                </a>
            </li>
        );

    },

    render() {
        return (
            <ul className="nav nav-tabs">
                <li className="nav-item">
                    <a
                        className={this.getStyle(tabs.front)}
                        onClick={this.onSwitchTab(tabs.front)}
                        href="#">
                        {'Front'}
                    </a>
                </li>
                {this.getBack()}
                <li className="nav-item">
                    <a
                        className={this.getStyle(tabs.description)}
                        onClick={this.onSwitchTab(tabs.description)}
                        href="#">
                        {'Description'}
                    </a>
                </li>
                {this.getStashes()}
                <li className="nav-item">
                    <a
                        className={this.getStyle(tabs.meta)}
                        onClick={this.onSwitchTab(tabs.meta)}
                        href="#">
                        {'Meta'}
                    </a>
                </li>
            </ul>
        );
    }

});

module.exports = CardTabs;
