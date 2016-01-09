const React = require('react');
const classnames = require('classnames');

const courier = require('courier');

const StashesAll = require('./stashes_all');
const StashesBelongsTo = require('./stashes_belongsto');

const generateButtonStyle = function(truth) {
    return {
        'btn-primary': truth,
        'btn-primary-outline': !truth,
        'disabled': truth
    };
};


const CardStashes = React.createClass({

    propTypes: {
        cardID: React.PropTypes.number.isRequired
    },

    getInitialState() {

        return {
            view: 'belongs_to'
        };

    },

    onSwitchTab(tabType) {

        return (event) => {
            event.preventDefault();
            event.stopPropagation();

            if(this.state.view == tabType) {
                return;
            }

            this.setState({
                view: tabType
            });
        };

    },

    getListComponent() {

        switch(this.state.view) {

        case 'belongs_to':

            return <StashesBelongsTo cardID={this.props.cardID} />;

            break;

        case 'all':

            return <StashesAll cardID={this.props.cardID} />;

            break;

        default:

            throw Error(`Unexpected view. Given ${this.state.view}`);
        }

    },

    render() {

        const {view} = this.state;

        return (
            <div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <button
                            type="button"
                            className={classnames('btn-sm', 'btn', generateButtonStyle(view == 'belongs_to'))}
                            onClick={this.onSwitchTab('belongs_to')}
                        >
                            {'Belongs to'}
                        </button>
                        {' '}
                        <button
                            type="button"
                            className={classnames('btn-sm', 'btn', generateButtonStyle(view == 'all'))}
                            onClick={this.onSwitchTab('all')}
                        >
                            {'All'}
                        </button>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        {this.getListComponent()}
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = courier({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    component: CardStashes,

    watch(props, manual, context) {
        return [
            context.store.cards.watchCurrentID()
        ];
    },

    assignNewProps: function(props, context) {

        return {

            cardID: context.store.cards.currentID()

        };

    }
});
