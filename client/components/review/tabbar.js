const React = require('react');
const classnames = require('classnames');

const difficulty = require('constants/difficulty');

const STYLE_FAIL = {
    width: '33.33%'
};

const STYLE_SUCCESS = {
    width: '50%'
};

const BUTTON_GROUP_STYLE = {
    width: '100%'
};

const ReviewTabBar = React.createClass({

    propTypes: {
        reveal: React.PropTypes.bool.isRequired,

        difficulty: React.PropTypes.oneOf([
            difficulty.forgot,
            difficulty.hard,
            difficulty.fail,
            difficulty.good,
            difficulty.easy,
            difficulty.none
        ]).isRequired,

        onReveal: React.PropTypes.func.isRequired,
        onNext: React.PropTypes.func.isRequired,
        onSkip: React.PropTypes.func.isRequired,
        onChooseDifficulty: React.PropTypes.func.isRequired
    },

    getDefaultProps() {

        return {
            reveal: false,
            difficulty: difficulty.none
        };
    },

    onReveal(event) {
        event.preventDefault();
        event.stopPropagation();

        this.props.onReveal.call(null);
    },

    onSkip(event) {
        event.preventDefault();
        event.stopPropagation();

        this.props.onSkip.call(null);
    },

    onNext(event) {
        event.preventDefault();
        event.stopPropagation();

        this.props.onNext.call(null);
    },

    onChooseDifficulty(difficultyTag) {

        return (event) => {
            event.preventDefault();
            event.stopPropagation();

            this.props.onChooseDifficulty.call(null, difficultyTag);
        };

    },

    primaryState() {

        return (
            <div key="primary">
                <div className="col-sm-9">
                    <button
                        type="button"
                        className="btn btn-primary btn-lg btn-block"
                        onClick={this.onReveal}
                    >
                        {'Show Back Side'}
                    </button>
                </div>
                <div className="col-sm-3">
                    <button
                        type="button"
                        className="btn btn-warning btn-lg btn-block"
                        onClick={this.onSkip}
                    >
                        {'Skip Card'}
                    </button>
                </div>
            </div>
        );

    },

    getButtonClass(difficultyTag, chosenStyle, notChosenStyle) {

        return classnames('btn', {
            [chosenStyle]: this.props.difficulty === difficultyTag,
            [notChosenStyle]: this.props.difficulty !== difficultyTag
        });

    },

    secondaryState() {

        return (
            <div key="secondary">
                <div className="col-sm-4">
                    <div className="btn-group btn-group-lg" style={BUTTON_GROUP_STYLE} role="group">
                        <button
                            type="button"
                            style={STYLE_FAIL}
                            className={this.getButtonClass(difficulty.forgot, 'btn-danger', 'btn-danger-outline')}
                            onClick={this.onChooseDifficulty(difficulty.forgot)}
                        >
                            {'Forgot'}
                        </button>
                        <button
                            type="button"
                            style={STYLE_FAIL}
                            className={this.getButtonClass(difficulty.hard, 'btn-danger', 'btn-danger-outline')}
                            onClick={this.onChooseDifficulty(difficulty.hard)}
                        >
                            {'Hard'}
                        </button>
                        <button
                            type="button"
                            style={STYLE_FAIL}
                            className={this.getButtonClass(difficulty.fail, 'btn-danger', 'btn-danger-outline')}
                            onClick={this.onChooseDifficulty(difficulty.fail)}
                        >
                            {'Fail'}
                        </button>
                    </div>
                </div>
                <div className="col-sm-4">
                    <div className="btn-group btn-group-lg" style={BUTTON_GROUP_STYLE} role="group">
                        <button
                            type="button"
                            style={STYLE_SUCCESS}
                            className={this.getButtonClass(difficulty.good, 'btn-success', 'btn-success-outline')}
                            onClick={this.onChooseDifficulty(difficulty.good)}
                        >
                            {'Good'}
                        </button>
                        <button
                            type="button"
                            style={STYLE_SUCCESS}
                            className={this.getButtonClass(difficulty.easy, 'btn-success', 'btn-success-outline')}
                            onClick={this.onChooseDifficulty(difficulty.easy)}
                        >
                            {'Easy'}
                        </button>
                    </div>
                </div>
                <div className="col-sm-4">
                    <div className="btn-group btn-group-lg" style={BUTTON_GROUP_STYLE} role="group">
                        <button
                            type="button"
                            style={{width: '70%'}}
                            className="btn btn-info-outline"
                            onClick={this.onNext}
                        >
                            {'Next'}
                        </button>
                        <button
                            type="button"
                            style={{width: '30%'}}
                            className="btn btn-info-outline"
                            onClick={this.onSkip}
                        >
                            {'Skip'}
                        </button>
                    </div>
                </div>
            </div>
        );

    },

    getComponent() {

        if(!this.props.reveal) {
            return this.primaryState();
        }

        return this.secondaryState();

    },

    render() {

        return (
            <div className="row">
                {this.getComponent()}
            </div>
        );
    }
});

module.exports = ReviewTabBar;
