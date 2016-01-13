const React = require('react');
const ReactDOM = require('react-dom');
const classnames = require('classnames');
const _ = require('lodash');

const dropDownItemStyle = {
    fontSize: '.875rem'
};

const SortDropDown = React.createClass({

    getInitialState() {
        return {
            open: false
        };
    },

    propTypes: {
        currentLabel: React.PropTypes.string.isRequired,
        // array of tuples (String, any)
        listOrder: React.PropTypes.array.isRequired,
        onClickSort: React.PropTypes.func.isRequired
    },

    // notes: https://github.com/facebook/react/issues/579#issuecomment-60841923

    componentDidMount: function () {
        document.body.addEventListener('click', this.handleBodyClick);
    },

    componentWillUnmount: function () {
        document.body.removeEventListener('click', this.handleBodyClick);
    },

    handleBodyClick: function (event) {

        if(!this.state.open || event.target == ReactDOM.findDOMNode(this.refs.sortbutton)) {
            return;
        }

        this.setState({
            open: !this.state.open
        });
    },

    dropdownClickHandler: function(e) {
        event.preventDefault();
        event.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
    },

    onClickDropdown(event) {
        event.preventDefault();
        event.stopPropagation();

        this.setState({
            open: !this.state.open
        });
    },

    onClickSort(input) {
        return (event) => {
            event.preventDefault();
            event.stopPropagation();

            this.props.onClickSort.call(void 0, input);
        };
    },

    getLabel() {
        return this.props.currentLabel;
    },

    getListItems() {

        return _.reduce(this.props.listOrder, function(buttons, [label, input], index) {

            const key = `${index}`;

            buttons.push(
                <a
                    key={key}
                    className="dropdown-item sortbutton"
                    href="#"
                    style={dropDownItemStyle}
                    onClick={this.onClickSort(input)}
                >
                    {label}
                </a>
            );

            return buttons;
        }, [], this);

    },

    render() {

        return (
            <div>
                <div className={classnames('dropdown', {open: this.state.open})}>
                    <button
                        ref="sortbutton"
                        className="btn btn-sm btn-secondary dropdown-toggle"
                        type="button"
                        id="dropdownMenu1"
                        data-toggle="dropdown"
                        aria-haspopup="true"
                        aria-expanded="false"

                        onClick={this.onClickDropdown}>
                        {`Sort by `}
                        <strong>
                            {this.getLabel()}
                        </strong>
                    </button>
                    <div className="dropdown-menu dropdown-menu-right">
                        {this.getListItems()}
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = SortDropDown;
