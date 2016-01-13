const React = require('react');
const _ = require('lodash');
const classnames = require('classnames');

const courier = require('courier');

const StashMeta = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        name: React.PropTypes.string.isRequired
    },

    getInitialState() {
        return {
            name: void 0
        };
    },

    onNameChange(event) {

        this.setState({
            name: String(event.target.value)
        });
    },

    stashName() {

        const name = this.state.name;

        if(_.isString(name)) {
            return name;
        }

        return this.props.name;

    },

    renameStash(event) {
        event.preventDefault();
        event.stopPropagation();

        if(!_.isString(this.state.name) ||
            this.state.name.trim().length <= 0 ||
            this.state.name.trim() == this.props.name) {
            return;
        }

        this.context.store.stashes.patchCurrent({
            name: String(this.state.name).trim()
        });
    },

    render() {
        return (
            <div className="row">
                <div className="col-sm-12">
                    <div className="card">
                        <div className="card-header">
                            <strong>{'Stash name'}</strong>
                        </div>
                        <div className="card-block">
                            <p className="card-text">
                                <input
                                    ref="stash_name"
                                    className="form-control"
                                    type="text"
                                    onChange={this.onNameChange}
                                    value={this.stashName()}
                                    placeholder="Name of Stash"
                                />
                            </p>
                            <a
                                href="#"
                                className={classnames('btn', 'btn-success', 'btn-sm', {
                                    'disabled': !_.isString(this.state.name) ||
                                        this.state.name.trim().length <= 0 ||
                                        this.state.name.trim() == this.props.name
                                })}
                                onClick={this.renameStash}
                            >
                                {'Rename Stash'}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = courier({

    component: StashMeta,

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    watch(props, manual, context) {
        return context.store.stashes.watchCurrent();
    },

    assignNewProps: function(props, context) {

        return context.store.stashes.current()
            .then(function(stash) {

                return {
                    name: stash.get('name')
                };

            });
    }
});

