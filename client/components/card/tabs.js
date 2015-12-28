const React = require('react');
const classnames = require('classnames');

const STYLE = {
    fontSize: '.875rem'
};

const FRONT = 'Front';
const BACK = 'Back';
const DESCRIPTION = 'Description';
const STASHES = 'Stashes';

const CardTabs = React.createClass({

    propTypes: {
        onSwitch: React.PropTypes.func.isRequired,
        currentTab: React.PropTypes.oneOf([FRONT, BACK, DESCRIPTION, STASHES])
    },

    getDefaultProps() {

        return {
            currentTab: FRONT
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

            const {onSwitch} = this.props;

            onSwitch.call(null, tabType);
        };

    },

    render() {
        return (
            <ul className="nav nav-tabs" style={STYLE} >
                <li className="nav-item">
                    <a
                        className={this.getStyle(FRONT)}
                        onClick={this.onSwitchTab(FRONT)}
                        href="#">
                        {FRONT}
                    </a>
                </li>
                <li className="nav-item">
                    <a
                        className={this.getStyle(BACK)}
                        onClick={this.onSwitchTab(BACK)}
                        href="#">
                        {BACK}
                    </a>
                </li>
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
                        href="#">
                        {STASHES}
                    </a>
                </li>
            </ul>
        );
    }

});

module.exports = CardTabs;
