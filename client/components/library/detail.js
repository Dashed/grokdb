const React = require('react');

const courier = require('courier');

const Promise = require('bluebird');

const LibraryDetail = React.createClass({
    render() {
        return (
            <div>
                {'detail'}
            </div>
        );
    }
});



const WaitingLibraryDetail = React.createClass({
    render() {
        return (
            <div>
                {'waiting'}
            </div>
        );
    }
});

module.exports = courier({
    component: LibraryDetail,
    // waitingComponent: WaitingLibraryDetail,

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    assignNewProps: function(props, context) {

        const route = context.store.routes.route();

        return Promise.resolve({
            cat: 42
        });
    }
});
