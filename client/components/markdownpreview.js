/*global MathJax: true */
/*eslint new-cap: [2, {"capIsNewExceptions": ["MathJax.Hub.Queue", "Remove"]}]*/

// display markdown content that may contain MathJax markup

const React = require('react');
const ReactDOM = require('react-dom');
const _ = require('lodash');

const markdown = require('markdown-it')()
    // custom plugin to mark mathjax markup to not be escaped by markdown-it
    // and related plugins
    .use(require('utils/mathjaxinline'))
    // load with plugins (officially supported by markdown-it)
    .use(require('markdown-it-abbr'))
    .use(require('markdown-it-footnote'))
    .use(require('markdown-it-sub'))
    .use(require('markdown-it-sup'));


const MarkdownPreview = React.createClass({

    propTypes: {
        text: React.PropTypes.string.isRequired
    },

    generateMarkdown(input) {
        return {
            __html: markdown.render(input)
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

    render() {
        return (
            <div key="markdownpreview" className="markdownrender" ref="output" dangerouslySetInnerHTML={this.generateMarkdown(this.props.text)} />
        );
    }
});

module.exports = MarkdownPreview;
