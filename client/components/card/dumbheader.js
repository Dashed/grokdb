/*global MathJax: true */
/*eslint new-cap: [2, {"capIsNewExceptions": ["MathJax.Hub.Queue", "Remove"]}]*/

const React = require('react');
const ReactDOM = require('react-dom');
const _ = require('lodash');

const NAME_STYLE = {
    'overflowWrap': 'break-word',
    'wordWrap': 'break-word',
    'overflow': 'hidden'
};

const DumbCardHeader = React.createClass({

    propTypes: {
        isReviewing: React.PropTypes.bool,
        cardTitle: React.PropTypes.string.isRequired,
        cardID: React.PropTypes.number.isRequired
    },

    getDefaultProps() {

        return {
            isReviewing: false
        };
    },

    componentDidUpdate() {

        if(!MathJax) {
            return;
        }

        MathJax.Hub.Queue(['Typeset', MathJax.Hub, ReactDOM.findDOMNode(this.refs.output)]);
    },

    componentDidMount() {

        if(!MathJax) {
            return;
        }

        MathJax.Hub.Queue(['Typeset', MathJax.Hub, ReactDOM.findDOMNode(this.refs.output)]);
    },

    componentWillUnmount() {

        if(!MathJax) {
            return;
        }

        _.each(MathJax.Hub.getAllJax(ReactDOM.findDOMNode(this.refs.output)), function(jax) {
            jax.Remove();
        });
    },

    getLead() {

        const {cardID, isReviewing} = this.props;

        if(isReviewing) {
            return `Reviewing Card #${cardID}`;
        }

        return `Card #${cardID}`;

    },

    render() {

        const {cardTitle} = this.props;

        return (
            <div>
                <h4 className="m-y-0" style={NAME_STYLE}>
                    <span className="text-muted lead">
                        {this.getLead()}
                    </span>
                    {' '}
                    <span ref="card_title">{cardTitle}</span>
                </h4>
            </div>
        );
    }
});

module.exports = DumbCardHeader;
