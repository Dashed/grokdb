const React = require('react');
const classnames = require('classnames');


const generateButtonStyle = function(truth) {
    return {
        'btn-primary': truth,
        'btn-primary-outline': !truth,
        'disabled': truth
    };
};

const NO_OP = () => void 0;

const RenderSourceTabs = React.createClass({

    getDefaultProps() {
        return {
            isEditing: false,
            showRender: true,
            onEdit: NO_OP,
            onCancelEdit: NO_OP
        };
    },

    propTypes: {
        onSwitch: React.PropTypes.func.isRequired,
        showRender: React.PropTypes.bool,
        isEditing: React.PropTypes.bool,
        onEdit: React.PropTypes.func,
        onCancelEdit: React.PropTypes.func
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

    onEdit(event) {
        event.preventDefault();
        event.stopPropagation();

        this.props.onEdit.call(null);
    },

    onCancelEdit(event) {
        event.preventDefault();
        event.stopPropagation();

        this.props.onCancelEdit.call(null);
    },

    getEditButton() {

        if(!this.props.isEditing) {
            return (
                <a href="#"
                    className={classnames(
                        'btn-sm',
                        'btn',
                        'pull-right',
                        'btn-success'
                    )}
                    onClick={this.onEdit}
                >
                {'Edit'}
                </a>
            );
        }

        return (
            <a href="#"
                className={classnames(
                    'btn-sm',
                    'btn',
                    'pull-right',
                    'btn-danger'
                )}
                onClick={this.onCancelEdit}
            >
            {'Cancel Edit'}
            </a>
        );

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
                    {this.getEditButton()}
                </div>
            </div>
        );
    }
});

module.exports = RenderSourceTabs;
