const React = require('react');
const Immutable = require('immutable');
const moment = require('moment');

const courier = require('courier');

const DumbBreadcrumb = require('components/deck/breadcrumb');
const BreadcrumbWaiting = require('components/deck/waitingbreadcrumb');
const CardMetaMove = require('./move');

const CurrentDeckBreadcrumb = courier({

    component: DumbBreadcrumb,
    waitingComponent: BreadcrumbWaiting,

    onlyWaitingOnMount: true,

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        deckID: React.PropTypes.number.isRequired,
    },

    assignNewProps: function(props, context) {

        let {deckID} = props;

        return context.store.decks.path(deckID)
            .then(function(path) {
                return {
                    path: path,
                    toDeck: (newdeckID) => {
                        context.store.routes.toDeck(newdeckID, 1);
                    },
                    dontLinkEnd: false
                };
            });
    }
});

const CardMeta = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        card: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        onDelete: React.PropTypes.func.isRequired,
        afterMove: React.PropTypes.func.isRequired
    },

    getDefaultProps() {
        return {
            afterMove: () => void 0
        };
    },

    getInitialState() {
        return {
            verifyDelete: false
        };
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
                        <CurrentDeckBreadcrumb
                            deckID={card.get('deck')}
                        />
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

    deleteVerify(event) {
        event.preventDefault();
        event.stopPropagation();

        this.setState({
            verifyDelete: true
        });
    },

    cancelDelete(event) {
        event.preventDefault();
        event.stopPropagation();

        this.setState({
            verifyDelete: false
        });
    },

    confirmDelete(event) {
        event.preventDefault();
        event.stopPropagation();

        const cardID = this.props.card.get('id');

        this.context.store.cards.remove(cardID)
        .then(() => {

            this.props.onDelete.call(void 0, this.props.card);

            return null;
        });
    },

    getDeleteButton() {

        if(this.state.verifyDelete) {
            return (
                <div key="delete_button">
                    <p className="card-text">
                        <strong>{'Are you absolutely sure?'}</strong>
                    </p>
                    <a
                        href="#"
                        className="btn btn-secondary btn-sm"
                        onClick={this.confirmDelete}
                    >
                        {'Yes, delete'}
                    </a>
                    {' '}
                    <a
                        href="#"
                        className="btn btn-secondary btn-sm"
                        onClick={this.cancelDelete}
                    >
                        {'No, cancel'}
                    </a>
                </div>
            );
        }

        return (
            <div key="delete_button">
                <a
                    href="#"
                    className="btn btn-danger btn-sm"
                    onClick={this.deleteVerify}
                >
                    {'Delete this Card'}
                </a>
            </div>
        );

    },

    getDeleteSection() {

        const {card} = this.props;

        return (
            <div className="row">
                <div className="col-sm-12">
                    <div className="card">
                        <div className="card-header">
                            <strong>{'Delete Card'}</strong>
                        </div>
                        <div className="card-block">
                            <p className="card-text">
                                {'Once you delete a card, there is no going back. Please be certain.'}
                            </p>
                            <ul className="card-text">
                                <li>{`Will be deleted from the deck it currently resides in (deck #${card.get('deck')}).`}</li>
                                <li>{'Will be deleted from any and all stashes that references it.'}</li>
                            </ul>
                            {this.getDeleteButton()}
                        </div>
                    </div>
                </div>
            </div>
        );
    },

    getMoveSection() {

        return (
            <div className="row">
                <div className="col-sm-12">
                    <CardMetaMove
                        afterMove={this.props.afterMove}
                        card={this.props.card}
                    />
                </div>
            </div>
        );

    },

    render() {
        return (
            <div className="row">
                <div className="col-sm-12">
                    {this.getGeneral()}
                    {this.getReviewed()}
                    {this.getPerformance()}
                    {this.getMoveSection()}
                    {this.getDeleteSection()}
                </div>
            </div>
        );
    }
});

// asdd

module.exports = CardMeta;
