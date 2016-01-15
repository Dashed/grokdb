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
            <div className="row">
                <div className="col-sm-12">
                    <div className="card">
                        <div className="card-header">
                            <strong>{'Review stats'}</strong>
                        </div>
                        <div className="card-block">
                            <p className="card-text">
                                {`${lastReviewed}`}
                            </p>
                            <p className="card-text">
                                {`${extraSummary}`}
                            </p>
                            <p className="card-text">
                                {`Last chosen for review ${lastChosenDatetime.format('dddd, MMMM Do YYYY, h:mm:ss a')} (${lastChosenDatetime.fromNow()})`}
                            </p>
                            <p className="card-text">
                                {chosenForReview}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );

    },

    getPerformance() {

        const {card} = this.props;

        const score = 100 - card.getIn(['review_stat', 'score']).toPrecision(5) * 100;

        return (
            <div className="row">
                <div className="col-sm-12">
                    <div className="card">
                        <div className="card-header">
                            <strong>{'Performance'}</strong>
                        </div>
                        <div className="card-block">
                            <p className="card-text">
                                {`Performance score of ${score}%`}
                            </p>
                            <h6>{'Internal scores'}</h6>
                            <p className="card-text">
                                <b>{'Success votes:'}</b>{` ${card.getIn(['review_stat', 'success'])}`}
                                <br/>
                                <b>{'Fail votes:'}</b>{` ${card.getIn(['review_stat', 'fail'])}`}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );

    },

    getGeneral() {

        const {card} = this.props;

        const createdAtDatetime = moment.unix(card.getIn(['created_at']));
        const updatedAtDatetime = moment.unix(card.getIn(['updated_at']));

        return (
            <div className="row">
                <div className="col-sm-12">
                    <div className="card">
                        <div className="card-header">
                            <strong>{'General'}</strong>
                        </div>
                        <div className="card-block">
                            <p className="card-text">
                                {`Updated ${updatedAtDatetime.format('dddd, MMMM Do YYYY, h:mm:ss a')} (${updatedAtDatetime.fromNow()})`}
                            </p>
                            <p className="card-text">
                                {`Created ${createdAtDatetime.format('dddd, MMMM Do YYYY, h:mm:ss a')} (${createdAtDatetime.fromNow()})`}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );

    },

    render() {
        return (
            <div className="row">
                <div className="col-sm-12">
                    {this.getReviewed()}
                    {this.getPerformance()}
                    {this.getGeneral()}
                </div>
            </div>
        );
    }
});

// asdd

module.exports = CardMeta;
