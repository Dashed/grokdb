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

        const lastReviewed = wasReviewed ? `Last reviewed ${lastReviewedDatetime.fromNow()}, or ${lastReviewedDatetime.format('dddd, MMMM Do YYYY, h:mm:ss a')}` :
        `Hasn't been reviewed yet.`;

        const extraSummary = wasReviewed ? `Reviewed ${card.getIn(['review_stat', 'times_reviewed'])} times.` : '';

        return (
            <div>
                <p>
                    {`${lastReviewed}`}
                </p>
                <p>
                    {`${extraSummary}`}
                </p>
                {
                    (() => {

                        if(!wasReviewed) {
                            return null;
                        }

                        return (
                            <p>
                                {`Chosen for review ${card.getIn(['review_stat', 'times_seen'])} times.`}
                            </p>
                        );

                    })()
                }
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

    render() {
        return (
            <div>
                <h4>{'Review stats'}</h4>
                {this.getReviewed()}
                <h4>{'Performance'}</h4>
                {this.getPerformance()}
            </div>
        );
    }
});

module.exports = CardMeta;
