const React = require('react');

const courier = require('courier');

const Breadcrumb = require('components/library/breadcrumb');

const CardDetail = React.createClass({
    render() {
        return (
            <div>
                <div className="row">
                    <div className="col-sm-12">
                        {'card name'}
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

    component: CardDetail,


});
