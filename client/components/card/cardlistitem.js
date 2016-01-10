const React = require('react');
const Immutable = require('immutable');
const moment = require('moment');

const CardListItem = React.createClass({

    propTypes: {
        cardID: React.PropTypes.number.isRequired,
        card: React.PropTypes.instanceOf(Immutable.Map).isRequired,

        onClick: React.PropTypes.func.isRequired
    },

    onClick(event) {
        event.preventDefault();
        event.stopPropagation();

        this.props.onClick.call(void 0);

    },

    render() {

        const {card} = this.props;

        // datetime of when last reviewed

        const offset = new Date().getTimezoneOffset();
        const lastReviewedDatetime = moment.unix(card.getIn(['review_stat', 'reviewed_at'])).utcOffset(-offset);

        const createdAt = moment.unix(card.get('created_at')).utcOffset(-offset);
        const wasReviewed = Math.abs(lastReviewedDatetime.diff(createdAt)) <= 250 ? false : true;

        const lastReviewed = wasReviewed ? `last reviewed ${lastReviewedDatetime.fromNow()}.` : `hasn't been reviewed yet.`;

        const extraSummary = wasReviewed ? `Reviewed ${card.getIn(['review_stat', 'times_reviewed'])} times.` : '';

        // TODO: get score
        const score = `Performance score of ${100-card.getIn(['review_stat', 'score']).toPrecision(5)*100}%`;

        return (
            <li className="list-group-item">
                <h6 className="list-group-item-heading m-y-0">
                    <a href="#" onClick={this.onClick} >
                        {card.get('title')}
                    </a>
                </h6>
                <p className="list-group-item-text m-y-0">
                    <small className="text-muted">
                        {`Card #${card.get('id')} ${lastReviewed} ${extraSummary} ${score}`}
                    </small>
                    <br/>
                    <small>
                        {'deck path'}
                    </small>
                </p>
            </li>
        );
    }

});

module.exports = CardListItem;
