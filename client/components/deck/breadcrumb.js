const React = require('react');
const _ = require('lodash');

const NAME_STYLE = {
    'overflowWrap': 'break-word',
    'wordWrap': 'break-word',
    'wordBreak': 'break-word'
};

const Breadcrumb = React.createClass({

    propTypes: {
        path: React.PropTypes.array.isRequired,

        // cosmetic flags
        isReviewing: React.PropTypes.bool.isRequired,
        toDeck: React.PropTypes.func.isRequired,
        dontLinkEnd: React.PropTypes.bool.isRequired
    },

    getDefaultProps() {

        return {
            isReviewing: false,
            dontLinkEnd: true
        };
    },

    toDeck(deckID) {
        return (event) => {
            event.preventDefault();
            event.stopPropagation();

            this.props.toDeck.call(void 0, deckID);
        };
    },

    generateCrumb() {

        const {path} = this.props;

        if(path.length <= 0) {
            return (
                <li key="bar">
                    {' '}
                </li>
            );
        }

        const end = path.length - 1;

        return _.map(path, (deck, index) => {

            const deckID = deck.get('id');

            const key = '' + deckID + index;

            if(this.props.dontLinkEnd && end == index) {
                return (
                    <li key={key} className="active">
                        {deck.get('name')}
                    </li>
                );
            }

            return (
                <li key={key}>
                    <a
                    onClick={this.toDeck(deckID)}
                    href="#">{deck.get('name')}</a>
                </li>
            );
        });
    },

    getReviewing() {

        if(!this.props.isReviewing) {
            return null;
        }

        return (
            <li>
                <strong>
                    {'Reviewing'}
                </strong>
            </li>
        );

    },

    render() {

        return (
            <ol className="breadcrumb m-y-0" style={NAME_STYLE}>
                {this.getReviewing()}
                <li key="foo">
                    {' '}
                </li>
                {this.generateCrumb()}
            </ol>
        );
    }
});

module.exports = Breadcrumb;
