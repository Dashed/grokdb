const React = require('react');
const _ = require('lodash');
const classnames = require('classnames');

const courier = require('courier');

const StashMeta = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        stashID: React.PropTypes.number.isRequired,
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

    deleteVerify(event) {
        event.preventDefault();
        event.stopPropagation();

        this.setState({
            verifyDelete: true
        });
    },

    cancelDelete(event) {
        event.preventDefault();
        event.stopPropagation();

        this.setState({
            verifyDelete: false
        });
    },

    confirmDelete(event) {
        event.preventDefault();
        event.stopPropagation();

        this.context.store.stashes.remove(this.props.stashID)
        .then(() => {

            this.context.store.routes.toStashes();

            return null;
        });
    },

    getDeleteButton() {

        if(this.state.verifyDelete) {
            return (
                <div key="delete_button">
                    <p className="card-text">
                        <strong>{'Are you absolutely sure?'}</strong>
                    </p>
                    <a
                        href="#"
                        className="btn btn-secondary btn-sm"
                        onClick={this.confirmDelete}
                    >
                        {'Yes, delete'}
                    </a>
                    {' '}
                    <a
                        href="#"
                        className="btn btn-secondary btn-sm"
                        onClick={this.cancelDelete}
                    >
                        {'No, cancel'}
                    </a>
                </div>
            );
        }

        return (
            <div key="delete_button">
                <a
                    href="#"
                    className="btn btn-danger btn-sm"
                    onClick={this.deleteVerify}
                >
                    {'Delete this Stash'}
                </a>
            </div>
        );

    },

    getDeleteSection() {

        return (
            <div className="row">
                <div className="col-sm-12">
                    <div className="card">
                        <div className="card-header">
                            <strong>{'Delete Stash'}</strong>
                        </div>
                        <div className="card-block">
                            <p className="card-text">
                                {'Once you delete a stash, there is no going back. Please be certain.'}
                            </p>
                            <ul className="card-text">
                                <li>
                                    Will <b>not</b> delete any cards that this stash references.
                                </li>
                            </ul>
                            {this.getDeleteButton()}
                        </div>
                    </div>
                </div>
            </div>
        );
    },

    render() {
        return (
            <div className="row">
                <div className="col-sm-12">
                    <div className="row">
                        <div className="col-sm-12">
                            <div className="card">
                                <div className="card-header">
                                    <strong>{'Stash Name'}</strong>
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
                    {this.getDeleteSection()}
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
                    stashID: context.store.stashes.currentID(),
                    name: stash.get('name')
                };

            });
    }
});

