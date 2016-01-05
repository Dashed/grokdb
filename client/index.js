const React = require('react');
const ReactDOM = require('react-dom');
// const co = require('co');

const bootstrapStore = require('store');
const App = require('components/app');

const isSymbol = require('./utils/issymbol');


bootstrapStore
    .then(function(store) {

        return new Promise(function(resolve) {
            store.resetStage();

            const route = store.routes.route();
            if(isSymbol(route)) {
                resolve(store);
                return;
            }

            const cursor = store.state().cursor('route');

            const waiting = function() {

                cursor.once('any', function(_route) {

                    if(isSymbol(_route)) {
                        resolve(store);
                        return;
                    }

                    waiting();
                });
            };

            waiting();

        });
    })
    .then(function(store) {

        // console.log('====');
        // console.log(String(store.state()));
        // console.log('====');

        // NOTE: As of react v0.13, contexts are an undocumented feature
        // NOTE: As of react v0.13, React.withContext() is deprecated.
        // See: https://www.tildedave.com/2014/11/15/introduction-to-contexts-in-react-js.html
        const WithContext = React.createClass({

            childContextTypes: {
                store: React.PropTypes.object.isRequired
            },

            getChildContext: function() {
                return {
                    store: store
                };
            },

            render: function() {
                return (<App {...this.props} />);
            }
        });

        ReactDOM.render(<WithContext rootCursor={store.state()} />, document.getElementById('grokdb-container'));
    });

// TODO: issue: https://github.com/petkaantonov/bluebird/issues/903
// co(function* () {

//     const store = yield bootstrapStore;

//     // ensure and wait for route to be settled

//     yield new Promise(function(resolve) {
//         store.resetStage();

//         const route = store.routes.route();
//         if(isSymbol(route)) {
//             resolve();
//         }

//         const cursor = store.state().cursor('route');

//         const waiting = function() {

//             cursor.once('any', function(_route) {

//                 if(isSymbol(_route)) {
//                     resolve();
//                     return;
//                 }

//                 waiting();
//             });
//         };

//         waiting();

//     });

//     console.log('====');
//     console.log(String(store.state()));
//     console.log('====');

//     // NOTE: As of react v0.13, contexts are an undocumented feature
//     // NOTE: As of react v0.13, React.withContext() is deprecated.
//     // See: https://www.tildedave.com/2014/11/15/introduction-to-contexts-in-react-js.html
//     const WithContext = React.createClass({

//         childContextTypes: {
//             store: React.PropTypes.object.isRequired
//         },

//         getChildContext: function() {
//             return {
//                 store: store
//             };
//         },

//         render: function() {
//             return (<App {...this.props} />);
//         }
//     });

//     ReactDOM.render(<WithContext rootCursor={store.state()} />, document.getElementById('grokdb-container'));

// });
