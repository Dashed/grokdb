const React = require('react');
const _ = require('lodash');
const shallowEqual = require('shallowequal');

const courier = require('courier');

const CardListItem = require('./cardlistitem');
const CardsSortDropDown = require('./cardssortdropdown');
const CardsPagination = require('./cardspagination');
const WaitingCardListItem = require('components/card/waitingcardlistitem');

const DumbCardsList = React.createClass({

    propTypes: {
        cardIDs: React.PropTypes.array.isRequired
    },

    cardsList() {

        const cardIDs = this.props.cardIDs;

        if(cardIDs.length <= 0) {
            return (
                <div className="card">
                    <div className="card-block text-center">
                        <p className="card-text text-muted">
                            {'No cards to display. To get started, you should create your first card for this deck.'}
                        </p>
                    </div>
                </div>
            );
        }

        const items = _.map(cardIDs, (cardID, index) => {

            const key = '' + cardID + index;

            return (
                <CardListItem key={key} cardID={cardID} />
            );

        });

        return (
            <ul className="list-group">
                {items}
            </ul>
        );

    },

    render() {
        return (
            <div className="row">
                <div className="col-sm-12">
                    {this.cardsList()}
                </div>
            </div>
        );
    }
});

const WaitingDumbCardsList = React.createClass({

    cardsList() {

        let items = [];

        let n = 1;

        while(n-- > 0) {
            items.push(
                <WaitingCardListItem key={n} />
            );
        }

        return (
            <ul className="list-group">
                {items}
            </ul>
        );
    },

    render() {
        return (
            <div className="row">
                <div className="col-sm-12">
                    {this.cardsList()}
                </div>
            </div>
        );
    }

});


const CardsList = courier({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    component: DumbCardsList,
    waitingComponent: WaitingDumbCardsList,

    onlyWaitingOnMount: true,

    watch(props, manual, context) {
        return [
            context.store.cards.watchPage(),
            context.store.decks.watchCurrentID(),
            context.store.cards.watchSearch(),
            context.store.cards.watchOrder(),
            context.store.cards.watchSort()
        ];
    },

    shouldComponentUpdate(nextProps) {
        // don't reload cards list when cardIDs are the same.
        // when a new page is requested, wrapped component may be pinged to
        // re-render on same cardIDs as new page resolves.
        return !shallowEqual(nextProps.cardIDs, this.props.cardIDs);
    },

    assignNewProps: function(props, context) {

        return context.store.cards.currentCardsID()
            .then((cardIDs) => {

                return {
                    cardIDs: cardIDs
                };

            });
    }

});

const SearchBar = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    getInitialState() {

        return {
            search: void 0
        };
    },

    getSearchQuery() {

        if(_.isString(this.state.search)) {
            return this.state.search;
        }

        let query = this.context.store.cards.search();

        if(!_.isString(query)) {
            query = '';
        }

        return query.trim();
    },

    onSearchChange(event) {
        event.persist();

        this.setState({
            search: event.target.value
        });

        this.delayedSearch(event);
    },

    componentWillMount: function () {
        this.delayedSearch = _.debounce((event) => {

            const query = String(event.target.value).trim();

            this.context.store.cards.changeSort(void 0, void 0, query);

        }, 400);
    },

    onClear(event) {
        event.preventDefault();
        event.stopPropagation();

        if(_.isString(this.state.search) && this.state.search.length <= 0) {
            return;
        }

        this.setState({
            search: ''
        });

        this.context.store.cards.changeSort(void 0, void 0, '');

    },

    getClearButton() {

        if(this.getSearchQuery().length <= 0) {
            return (
                <span key="clear-btn-disabled" className="input-group-btn">
                    <button
                        className="btn btn-sm btn-secondary"
                        type="button"
                        onClick={this.onClear}
                        disabled
                    >{'Clear'}</button>
                </span>
            );
        }

        return (
            <span key="clear-btn" className="input-group-btn">
                <button
                    className="btn btn-sm btn-secondary"
                    type="button"
                    onClick={this.onClear}
                >{'Clear'}</button>
            </span>
        );

    },

    render() {

        return (
            <div className="searchbox m-x">
                <div className="input-group input-group-sm">
                    <input
                        className="form-control form-control-sm"
                        type="text"
                        placeholder="Search Cards"
                        value={this.getSearchQuery()}
                        onChange={this.onSearchChange}
                    />
                    {this.getClearButton()}
                </div>
            </div>
        );
    }
});

const LibraryCards = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    toNewCard(event) {
        event.preventDefault();
        event.stopPropagation();

        this.context.store.routes.toAddNewCard();

    },

    toReview(event) {
        event.preventDefault();
        event.stopPropagation();

        this.context.store.routes.toDeckReview();

    },

    onClickPage(requestedPageNum) {
        this.context.store.routes.toLibraryCardsPage(requestedPageNum);
    },

    render() {
        return (
            <div>
                <div className="row m-b">
                    <div className="col-sm-12" id="cards-list-nav">
                        <a href="#"
                            className="btn btn-sm btn-success m-r"
                            onClick={this.toNewCard}
                        >{'New Card'}</a>
                        <a href="#"
                            className="btn btn-sm btn-primary-outline"
                            onClick={this.toReview}
                        >{'Review this Deck'}</a>

                        <SearchBar />

                        <CardsSortDropDown />

                    </div>
                </div>
                <div className="row m-b">
                    <div className="col-sm-12">
                        <CardsList />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <CardsPagination
                            onClickPage={this.onClickPage}
                        />
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = LibraryCards;
