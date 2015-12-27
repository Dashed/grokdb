const React = require('react');

const courier = require('courier');


const CardsList = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    toNewCard(event) {
        event.preventDefault();
        event.stopPropagation();

        this.context.store.routes.toAddNewCard();

    },

    render() {
        return (
            <div>
                <div className="row m-b">
                    <div className="col-sm-12">
                        <div className="btn-group btn-group-sm" role="group" aria-label="Basic example">
                            <button
                                type="button"
                                className="btn btn-success"
                                onClick={this.toNewCard}
                            >{'New Card'}</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});


module.exports = courier({
    component: CardsList,

});
