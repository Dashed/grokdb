const React = require('react');
const Immutable = require('immutable');
const moment = require('moment');

const CardMeta = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        card: React.PropTypes.instanceOf(Immutable.Map).isRequired
    },

    getReviewed() {

        const {card} = this.props;

        // datetime of when last reviewed

        // const offset = new Date().getTimezoneOffset();
        const lastReviewedDatetime = moment.unix(card.getIn(['review_stat', 'reviewed_at']));

        const createdAt = moment.unix(card.get('created_at'));
        const wasReviewed = Math.abs(lastReviewedDatetime.diff(createdAt)) <= 250 ? false : true;

        const lastReviewed = wasReviewed ? `Last reviewed ${lastReviewedDatetime.format('dddd, MMMM Do YYYY, h:mm:ss a')} (${lastReviewedDatetime.fromNow()})` :
        `Hasn't been reviewed yet.`;

        const timesReviewed = card.getIn(['review_stat', 'times_reviewed']);

        const extraSummary = wasReviewed ? `Reviewed ${timesReviewed} ${timesReviewed > 1 ? 'times' : 'time'}.` : '';

        const lastChosenDatetime = moment.unix(card.getIn(['review_stat', 'seen_at']));

        const timesSeen = card.getIn(['review_stat', 'times_seen']);

        const chosenForReview = timesSeen > 0 ? `Chosen for review ${timesSeen} ${timesSeen > 1 ? 'times' : 'time'}.` : `Hasn't been chosen for review yet.`;

        return (
            <div>
                <p>
                    {`${lastReviewed}`}
                </p>
                <p>
                    {`${extraSummary}`}
                </p>
                <p>
                    {`Last chosen for review ${lastChosenDatetime.format('dddd, MMMM Do YYYY, h:mm:ss a')} (${lastChosenDatetime.fromNow()})`}
                </p>
                <p>
                    {chosenForReview}
                </p>
            </div>
        );

    },

    getPerformance() {

        const {card} = this.props;

        const score = 100 - card.getIn(['review_stat', 'score']).toPrecision(5) * 100;

        return (
            <div>
                <p>
                    {`Performance score of ${score}%`}
                </p>
                <h6>{'Internal scores'}</h6>
                <p>
                    <b>{'Success votes:'}</b>{` ${card.getIn(['review_stat', 'success'])}`}
                    <br/>
                    <b>{'Fail votes:'}</b>{` ${card.getIn(['review_stat', 'fail'])}`}
                </p>
            </div>
        );

    },

    getGeneral() {

        const {card} = this.props;

        const createdAtDatetime = moment.unix(card.getIn(['created_at']));
        const updatedAtDatetime = moment.unix(card.getIn(['updated_at']));

        return (
            <div>
                <p>
                    {`Updated ${updatedAtDatetime.format('dddd, MMMM Do YYYY, h:mm:ss a')} (${updatedAtDatetime.fromNow()})`}
                </p>
                <p>
                    {`Created ${createdAtDatetime.format('dddd, MMMM Do YYYY, h:mm:ss a')} (${createdAtDatetime.fromNow()})`}
                </p>
            </div>
        );

    },

    render() {
        return (
            <div>
                <h4>{'Review stats'}</h4>
                {this.getReviewed()}
                <h4>{'Performance'}</h4>
                {this.getPerformance()}
                <h4>{'General'}</h4>
                {this.getGeneral()}
            </div>
        );
    }
});

// asdd

module.exports = CardMeta;
