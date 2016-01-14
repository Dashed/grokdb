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

                        const lastChosenDatetime = moment.unix(card.getIn(['review_stat', 'seen_at']));

                        return (
                            <div>
                                <p>
                                    {`Last chosen for review ${lastChosenDatetime.fromNow()}, or ${lastChosenDatetime.format('dddd, MMMM Do YYYY, h:mm:ss a')}`}
                                </p>
                                <p>
                                    {`Chosen for review ${card.getIn(['review_stat', 'times_seen'])} times.`}
                                </p>
                            </div>
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

    getGeneral() {

        const {card} = this.props;

        const createdAtDatetime = moment.unix(card.getIn(['created_at']));
        const updatedAtDatetime = moment.unix(card.getIn(['updated_at']));

        return (
            <div>
                <p>
                    {`Updated ${updatedAtDatetime.fromNow()}, or ${updatedAtDatetime.format('dddd, MMMM Do YYYY, h:mm:ss a')}`}
                </p>
                <p>
                    {`Created ${createdAtDatetime.fromNow()}, or ${createdAtDatetime.format('dddd, MMMM Do YYYY, h:mm:ss a')}`}
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

module.exports = CardMeta;
