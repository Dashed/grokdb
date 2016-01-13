const React = require('react');
const _ = require('lodash');
const classnames = require('classnames');

const courier = require('courier');
const superhot = require('store/superhot');

// src: https://facebook.github.io/react/blog/2015/12/16/ismounted-antipattern.html
const makeCancelable = (promise) => {
    let hasCanceled_ = false;

    return {
        promise: new Promise(
            (resolve, reject) => promise
                .then(r => hasCanceled_ ? reject({isCanceled: true}) : resolve(r))
        ),

        cancel() {
            hasCanceled_ = true;
        },

        hasCanceled() {
            return hasCanceled_;
        }
    };
};

const Settings = React.createClass({

    getInitialState() {
        return {
            dbBackupName: void 0,
            disableBackupButton: false,
            pendingBackup: void 0, // type: Option<Promise>
            backedUpTo: void 0
        };
    },

    onBackupNameChange(event) {

        this.setState({
            dbBackupName: String(event.target.value)
        });
    },

    backupName() {

        const name = this.state.dbBackupName;

        if(_.isString(name)) {
            return name;
        }

        return '';

    },

    backupDB(event) {
        event.preventDefault();
        event.stopPropagation();

        // ensure there are no other pending backup requests
        if(this.state.pendingBackup !== void 0) {
            return;
        }

        let request = {};

        const backupName = this.backupName();

        if(String(backupName).length > 0) {
            request.name = backupName;
        }

        request.with_timestamp = true;

        const backUpPromise = new Promise((resolve, reject) => {

            superhot
                .put('/api/backup')
                .type('json')
                .send(request)
                .end((err, response) => {

                    switch(response.status) {

                    case 200:

                        if(!this.state.pendingBackup || this.state.pendingBackup.hasCanceled()) {
                            return reject(null);
                        }

                        this.setState({
                            disableBackupButton: false,
                            pendingBackup: void 0,
                            backedUpTo: response.body.dest_file
                        });

                        return resolve(true);
                        break;

                    default:

                        if (err) {
                            return reject(err);
                        }

                        return reject(Error(`Unexpected response. Given ${response}`));
                    }

                });

        });

        this.setState({
            pendingBackup: makeCancelable(backUpPromise),
            disableBackupButton: true
        });

    },

    getBackedUpTo() {

        if(!this.state.backedUpTo) {
            return null;
        }

        return (
            <p className="card-text">
                <small className="text-muted">
                    {`Backed up to: ${this.state.backedUpTo}`}
                </small>
            </p>
        );

    },

    componentWillUnmount() {

        if(this.state.pendingBackup) {
            this.state.pendingBackup.cancel();
        }

    },

    render() {
        return (
            <div className="row">
                <div className="col-sm-12">
                    <div className="card">
                        <div className="card-header">
                            <strong>{'Database Backup'}</strong>
                        </div>
                        <div className="card-block">
                            <p className="card-text">
                                <input
                                    ref="backup_db_name"
                                    className="form-control"
                                    type="text"
                                    onChange={this.onBackupNameChange}
                                    value={this.backupName()}
                                    placeholder="Backup Database Name"
                                />
                            </p>
                            <a
                                href="#"
                                className={classnames('btn', 'btn-success', 'btn-sm', {
                                    'disabled': this.state.disableBackupButton
                                })}
                                onClick={this.backupDB}
                            >
                                {'Back up database'}
                            </a>
                            {this.getBackedUpTo()}
                        </div>
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

    component: Settings,

    onlyWaitingOnMount: true,
});
