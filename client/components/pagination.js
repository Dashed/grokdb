const React = require('react');
const classnames = require('classnames');

const NAV_STYLE = {
    'textAlign': 'center'
};

const NOOP = () => void 0;

// magic constants

// amount of page buttons after/before current
const alpha = 3;
// amount of page buttons on the ends
const trailSize = 2;

const Pagination = React.createClass({

    propTypes: {
        numOfPages: React.PropTypes.number.isRequired,
        currentPage: React.PropTypes.number.isRequired,

        onClickCurrent: React.PropTypes.func,
        onClickPage: React.PropTypes.func.isRequired
    },

    getDefaultProps() {

        return {
            onClickCurrent: NOOP
        };
    },

    onClickPrevious(event) {
        event.preventDefault();
        event.stopPropagation();

        const requestedPage = this.props.currentPage - 1;

        if(requestedPage <= 0) {
            return;
        }

        this.props.onClickPage.call(null, requestedPage);
    },

    onClickNext(event) {
        event.preventDefault();
        event.stopPropagation();

        const requestedPage = this.props.currentPage + 1;

        if(requestedPage > this.props.numOfPages) {
            return;
        }

        this.props.onClickPage.call(null, requestedPage);
    },

    onClickCurrent(event) {
        event.preventDefault();
        event.stopPropagation();

        this.props.onClickCurrent.call(null);
    },

    onClickPage(requestedPage) {

        return (event) => {
            event.preventDefault();
            event.stopPropagation();

            this.props.onClickPage.call(null, requestedPage);
        };

    },

    getPrevButton() {

        const enablePrevious = this.props.currentPage > 1;

        return (
            <li className={classnames('page-item', {'disabled': !enablePrevious })}>
                <a href="#" aria-label="Previous" onClick={this.onClickPrevious}>
                    <span aria-hidden="true">{"Previous"}</span>
                    <span className="sr-only">{"Previous"}</span>
                </a>
            </li>
        );

    },

    getNextButton() {

        const enableNext = this.props.currentPage < this.props.numOfPages;

        return (
            <li className={classnames('page-item', {'disabled': !enableNext })}>
                <a href="#" aria-label="Next" onClick={this.onClickNext}>
                    <span aria-hidden="true">{"Next"}</span>
                    <span className="sr-only">{"Next"}</span>
                </a>
            </li>
        );

    },

    getLeftSide() {

        const {currentPage} = this.props;

        const beta = currentPage - alpha;

        const __leftSide = [];

        const start = beta <= 1 ? 1 : beta;
        const end = currentPage - 1;

        for(let i = start; i <= end; i++) {
            __leftSide.push(
                <li key={i} className="page-item">
                    <a href="#" onClick={this.onClickPage(i)}>{i}</a>
                </li>
            );
        }

        return __leftSide;
    },

    getRightSide() {

        const {currentPage, numOfPages} = this.props;

        const beta = currentPage + alpha;

        const __rightSide = [];

        const start = currentPage + 1;
        const end = beta >= numOfPages ? numOfPages : beta;

        for(let i = start; i <= end; i++) {
            __rightSide.push(
                <li key={i} className="page-item">
                    <a href="#" onClick={this.onClickPage(i)}>{i}</a>
                </li>
            );
        }
        return __rightSide;
    },

    getTrailingLeftSide() {

        const {currentPage} = this.props;

        const trailingLeftSide = [];
        const start = currentPage - alpha - 1 - trailSize;

        // overlapping exists; if possible, populate with rest of buttons
        if(start <= 0) {

            const end = currentPage - alpha - 1;

            if(end <= 0) {
                return null;
            }

            for(let i = 1; i <= end; i++) {
                trailingLeftSide.push(
                    <li key={i} className="page-item">
                        <a href="#" onClick={this.onClickPage(i)}>{i}</a>
                    </li>
                );
            }

            return trailingLeftSide;
        }

        for(let i = 1; i <= trailSize; i++) {
            trailingLeftSide.push(
                <li key={i} className="page-item">
                    <a href="#" onClick={this.onClickPage(i)}>{i}</a>
                </li>
            );
        }

        // add extra button
        if(start == 1) {

            const extraPageNum = 1 + trailSize;

            trailingLeftSide.push(
                <li key={extraPageNum} className="page-item">
                    <a href="#" onClick={this.onClickPage(extraPageNum)}>{extraPageNum}</a>
                </li>
            );
        } else {

            trailingLeftSide.push(
                <li key="etc-left" className="page-item disabled">
                    <span className="page-link">
                        …
                    </span>
                </li>
            );
        }

        return trailingLeftSide;
    },

    getTrailingRightSide() {

        const {currentPage, numOfPages} = this.props;

        const trailingRightSide = [];
        const end = currentPage + alpha + 1 + trailSize;

        // overlapping exists; if possible, populate with rest of buttons
        if(end > numOfPages) {

            const start = currentPage + alpha + 1;

            if(start > numOfPages) {
                return null;
            }

            for(let i = start; i <= numOfPages; i++) {
                trailingRightSide.push(
                    <li key={i} className="page-item">
                        <a href="#" onClick={this.onClickPage(i)}>{i}</a>
                    </li>
                );
            }

            return trailingRightSide;
        }

        // add extra button
        if(end == numOfPages) {

            const extraPageNum = (numOfPages - trailSize + 1) - 1;

            trailingRightSide.push(
                <li key={extraPageNum} className="page-item">
                    <a href="#" onClick={this.onClickPage(extraPageNum)}>{extraPageNum}</a>
                </li>
            );
        } else {

            trailingRightSide.push(
                <li key="etc-right" className="page-item disabled">
                    <span className="page-link">
                        …
                    </span>
                </li>
            );
        }

        const start = numOfPages - trailSize + 1;

        for(let i = start; i <= numOfPages; i++) {
            trailingRightSide.push(
                <li key={i} className="page-item">
                    <a href="#" onClick={this.onClickPage(i)}>{i}</a>
                </li>
            );
        }

        return trailingRightSide;
    },

    render() {

        return (
            <nav style={NAV_STYLE}>
                <ul className="pagination m-y-0 p-y-0">
                    {this.getPrevButton()}
                    {this.getTrailingLeftSide()}
                    {this.getLeftSide()}
                    <li className="page-item active">
                        <a href="#" onClick={this.onClickCurrent}>
                            {this.props.currentPage}
                            <span className="sr-only">{"(current)"}</span>
                        </a>
                    </li>
                    {this.getRightSide()}
                    {this.getTrailingRightSide()}
                    {this.getNextButton()}
                </ul>
            </nav>
        );
    }
});

module.exports = Pagination;
