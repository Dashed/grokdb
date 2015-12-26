const React = require('react');
const classnames = require('classnames');


const generateButtonStyle = function(truth) {
    return {
        'btn-primary': truth,
        'btn-primary-outline': !truth,
        'disabled': truth
    };
};

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
            <div className="row">
                <div className="col-sm-12">
                    <a href="#"
                        className={classnames('btn-sm', 'btn', generateButtonStyle(showRender))}
                        onClick={this.onSwitchTab('render')}
                    >
                    {'Render'}
                    </a>
                    {' '}
                    <a href="#"
                        className={classnames('btn-sm', 'btn', generateButtonStyle(!showRender))}
                        onClick={this.onSwitchTab('source')}
                    >
                    {'Source'}
                    </a>
                </div>
            </div>
        );
    }
});

module.exports = RenderSourceTabs;
