const React = require('react');
const TextareaAutosize = require('react-textarea-autosize');
const _ = require('lodash');

const courier = require('courier');
const RenderSourceTabs = require('components/rendersourcetabs');
const MarkdownPreview = require('components/markdownpreview');

const placeholder = 'No description given.';

const Description = React.createClass({

    propTypes: {
        description: React.PropTypes.string.isRequired
    },

    getInitialState() {
        return {
            showRender: true,
            isEditing: false,
            newDescription: void 0
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

    onDescriptionChange(event) {

        this.setState({
            newDescription: event.target.value
        });
    },

    getDescription() {

        // this.state.newDescription has precedence over this.props.description

        const description = this.state.newDescription;

        if(_.isString(description)) {
            return description;
        }

        return this.props.description;

    },

    getComponent() {

        const description = this.getDescription();

        if(this.state.showRender) {
            return <MarkdownPreview key="preview" text={description} />;
        }

        return (
            <TextareaAutosize
                key="textarea"
                useCacheForDOMMeasurements
                minRows={6}
                maxRows={10}
                className="form-control"
                id="deck_description"
                placeholder={placeholder}
                onChange={this.onDescriptionChange}
                value={description}
                readOnly={this.state.isEditing}
            />
        );
    },

    render() {

        return (
            <div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <RenderSourceTabs
                            showRender={this.state.showRender}
                            onSwitch={this.onSwitchTab}
                        />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        {this.getComponent()}
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = courier({

    component: Description,

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    watch(props, manual, context) {
        return context.store.decks.watchCurrent();
    },

    assignNewProps: function(props, context) {

        return context.store.decks.current()
            .then(function(deck) {

                return {
                    description: deck.get('description')
                };

            });
    }
});
