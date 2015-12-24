const React = require('react');
const shallowEqual = require('shallowequal');
const _ = require('lodash');
const invariant = require('invariant');

const isFunction = _.isFunction;
const isPlainObject = _.isPlainObject;
const isArray = _.isArray;
const assign = _.assign;

throw Error('dont use');

const WATCH_OBSERVABLE = function() {
    return void 0;
};

const SHOULD_REWATCH_OBSERVABLE = function() {
    return false;
};

const ASSIGN_NEW_PROPS = function() {
    return {};
};

const SHOULD_ASSIGN_NEW_PROPS = function() {
    return true;
};

function __shouldComponentUpdateShallow(nextProps, nextState) {
    return !shallowEqual(this.state.currentProps, nextState.currentProps);
}

let __shouldComponentUpdateGlobal = __shouldComponentUpdateShallow;

const orwell = function(Component, orwellSpec) {

    let watch = orwellSpec.watch || null;
    let shouldRewatch = orwellSpec.shouldRewatch || null;
    let assignNewProps = orwellSpec.assignNewProps || null;
    let shouldAssignNewProps = orwellSpec.shouldAssignNewProps || null;

    // fallbacks
    if (!isFunction(watch)) {
        watch = WATCH_OBSERVABLE;
    }

    if (!isFunction(shouldRewatch)) {
        shouldRewatch = SHOULD_REWATCH_OBSERVABLE;
    }

    if (!isFunction(assignNewProps)) {
        assignNewProps = ASSIGN_NEW_PROPS;
    }

    if (!isFunction(shouldAssignNewProps)) {
        shouldAssignNewProps = SHOULD_ASSIGN_NEW_PROPS;
    }

    let __shouldComponentUpdate = __shouldComponentUpdateGlobal;
    let OrwellContainer;

    let classSpec = {

        __isMounted() {
            return !!this.mounted;
        },

        assignNewProps(props, context) {
            const ret = assignNewProps.call(null, props, context);
            return isPlainObject(ret) ? ret : {};
        },

        watch(props, context) {
            let numberSubscribers = 0;
            let unsubs = [];

            /**
             * usage:
             *
             * manual(function(update) {
             *
             *   const unsubscribe = cursor.on(event, function() {
             *     // ...
             *     update();
             *   });
             *   return unsubscribe;
             * });
             *
             * user call manual function with a function that take in an update function.
             * The provided function will allow a custom validation step whenever some
             * observable has changed. If this validation passes, user would call the update
             * function to induce a re-render.
             */
            const manual = (fn) => {

                numberSubscribers++;

                const cleanup = fn.call(null, this.handleChanged, this.__isMounted);
                if(cleanup && isFunction(cleanup)) {
                    unsubs.push(cleanup);
                }
            };

            let observables = watch.call(null, props, manual, context);

            if(!isArray(observables)) {
                observables = [observables];
            }

            numberSubscribers += observables.length;

            const listener = () => {
                this.handleChanged();
            };

            let len = observables.length;
            while(len-- > 0) {
                const observable = observables[len];
                const unsub = observable.observe(listener);
                unsubs.push(unsub);
            }

            invariant(unsubs.length >= numberSubscribers, `Expected to have at least ${numberSubscribers} cleanup functions for observers. But only received ${unsubs.length} cleanup functions.`);

            // NOTE: `render()` will see the updated state and will be executed
            // only once despite the state change.
            this.setState({
                unsubs: unsubs
            });
        },

        cleanWatchers() {
            const unsubs = this.state.unsubs || [];

            if(!isArray(unsubs)) {
                return;
            }

            let len = unsubs.length;
            while(len-- > 0) {
                const unsub = unsubs[len];
                unsub.call(null);
            }
        },

        // this function is subscribed to all given observables, and is called whenever
        // any of those observables change in some way.
        handleChanged() {

            if(!this.__isMounted()) {
                return;
            }

            const ctx = {
                currentProps: this.state.currentProps
            };

            if(shouldRewatch.call(ctx, this.props, this.context)) {
                this.cleanWatchers();
                this.watch(this.props, this.context);
            }

            if(!shouldAssignNewProps.call(ctx, this.props, this.context)) {
                return;
            }
            this.setState({
                currentProps: assign({}, this.props, this.assignNewProps(this.props, this.context))
            });
        },

        /* React API */

        displayName: `${Component.displayName}.OrwellContainer`,

        getInitialState() {

            this.mounted = true;

            return {
                // Array of functions to be called when OrwellContainer unmounts.
                // These functions, when called, handle any necessary cleanup step.
                unsubs: [],
                currentProps: assign({}, this.props, this.assignNewProps(this.props, this.context))
            };
        },

        shouldComponentUpdate(nextProps, nextState) {
            return __shouldComponentUpdate.call(this, nextProps, nextState);
        },

        componentWillReceiveProps(nextProps, nextContext) {

            const ctx = {
                currentProps: this.state.currentProps
            };

            if(shouldRewatch.call(ctx, nextProps, nextContext)) {
                this.cleanWatchers();
                this.watch(nextProps, nextContext);
            }

            if(!shouldAssignNewProps.call(ctx, nextProps, nextContext)) {
                return;
            }

            this.setState({
                currentProps: assign({}, nextProps, this.assignNewProps(nextProps, nextContext))
            });
        },

        componentWillMount() {
            this.mounted = true;
            this.watch(this.props, this.context);
        },

        componentWillUnmount() {
            this.mounted = false;
            this.cleanWatchers();
        },

        render() {
            return (<Component {...this.state.currentProps} />);
        }
    };

    OrwellContainer = React.createClass(assign({}, orwellSpec, classSpec));

    return OrwellContainer;

};

module.exports = orwell;
