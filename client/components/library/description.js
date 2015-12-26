const React = require('react');

const RenderSourceTabs = require('components/rendersourcetabs');

const Description = React.createClass({

    getInitialState() {
        return {
            showRender: true
        };
    },

    onSwitchTab(tabType) {

        let showRender = true;

        switch(tabType) {
        case 'render':
            showRender = true;
            break;
        case 'source':
            showRender = false;
            break;
        default:
            throw Error(`Unexpected tabType. Given: ${tabType}`);
        };

        this.setState({
            showRender: showRender
        });

    },

    render() {
        return (
            <div>
                <div className="row">
                    <div className="col-sm-12">
                        <RenderSourceTabs
                            showRender={this.state.showRender}
                            onSwitch={this.onSwitchTab}
                        />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        {'description'}
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = Description;
