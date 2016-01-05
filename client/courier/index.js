const React = require('react');
const _ = require('lodash');
const invariant = require('invariant');
const shallowEqual = require('shallowequal');
const isPromise = require('is-promise');

const isFunction = _.isFunction;
const assign = _.assign;
const isArray = _.isArray;
const isPlainObject = _.isPlainObject;
const isObject = _.isObject;
const hasProp = _.has;
const isBool = _.isBoolean;

// TODO: overridable shouldComponentUpdate
// TODO: add more more comment documentation

// TODO: this is a fork of orwell; merge into orwell when stable.

// TODO:
// Issues regarding interoperability between Promises and react:
// - https://github.com/facebook/react/issues/5465
// - https://facebook.github.io/react/blog/2015/12/16/ismounted-antipattern.html
// - Promise spec doesn't outline solid cases for cancellation
// - http://stackoverflow.com/questions/21781434/status-of-cancellable-promises

/**

Rationale:
- be able to asynchronously construct props using Promises
- can also construct props synchronously by returning a plain object

API / usage:

orwell({
    component: Component,
    waitingComponent: Waiting,
    errorComponent: ErrorComponent,

    // called when promise is rejected
    onError(reason) {

    },

    observe(observable, update, unsubscribe) {

        const unsub = observable.observe(function() {
            update();
        });

        unsubscribe(function() {
            ubsub();
        });
    },

    watch(props, manual, context) {

        return observable;

        // an array of observables. type: Array<Observable>
        return [...];
    },

    // return bool
    shouldRewatch(props, context) {
        return true / false;
    },

    shouldAssignNewProps(nextProps, nextContext) {
        return true / false;
    },

    assignNewProps(props, context) {

        // return plain object
        return {};

        // or return promise resolving to a plain object
        return Promise.resolve({});
    }
});

**/

const WATCH_OBSERVABLE = function() {
    return void 0;
};

const SHOULD_ASSIGN_NEW_PROPS = function() {
    return true;
};

const ASSIGN_NEW_PROPS = function() {
    return {};
};

const SHOULD_REWATCH_OBSERVABLE = function() {
    return false;
};

const ON_ERROR = function(reason) {
    console.error('Error occured', reason);

    if(console.trace) {
        console.trace();
    }
};

const Courier = function(inputSpec) {

    if(!hasProp(inputSpec, 'component')) {
        throw Error('Expected prop `component`.');
    }

    const onlyWaitingOnMount = hasProp(inputSpec, 'onlyWaitingOnMount') ? inputSpec.onlyWaitingOnMount : false;

    const Component = inputSpec.component;
    const WaitingComponent = inputSpec.waitingComponent || null;
    const ErrorComponent = inputSpec.errorComponent || null;

    let shouldAssignNewProps = inputSpec.shouldAssignNewProps || null;
    let assignNewProps = inputSpec.assignNewProps || null;
    let watchObservables = inputSpec.watch || null;
    let shouldRewatchObservables = inputSpec.shouldRewatch || null;
    let onError = inputSpec.onError || null;

    /* fallbacks */

    if(!isFunction(shouldAssignNewProps)) {
        shouldAssignNewProps = SHOULD_ASSIGN_NEW_PROPS;
    }

    if(!isFunction(assignNewProps)) {
        assignNewProps = ASSIGN_NEW_PROPS;
    }

    if(!isFunction(watchObservables)) {
        watchObservables = WATCH_OBSERVABLE;
    }

    if (!isFunction(shouldRewatchObservables)) {
        shouldRewatchObservables = SHOULD_REWATCH_OBSERVABLE;
    }

    if (!isFunction(onError)) {
        onError = ON_ERROR;
    }

    /* create Higher-Order Component */

    const classSpec = {

        // see: https://facebook.github.io/react/blog/2015/12/16/ismounted-antipattern.html
        //
        // This is provided externally for the caller to ensure if the HoC is still mounted.
        // This is useful especially if the caller manually pings the HoC if an external event
        // has occurred.
        //
        __isMounted() {
            return !!this.mounted;
        },

        assignNewProps(props, context) {

            const ret = assignNewProps.call(null, props, context, this.__isMounted);

            if(isPromise(ret) || isPlainObject(ret)) {
                return ret;
            }

            return {};
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

        watch(props, context) {


            if(watchObservables === WATCH_OBSERVABLE) {
                return;
            }

            let numberSubscribers = 0;
            let unsubs = [];

            const manual = (fn) => {

                if(!isFunction(fn)) {
                    throw Error(`Expected function. Given: ${fn}`);
                    return;
                }

                numberSubscribers++;

                // create unique function instance that proxies handleChanged().
                let listener = () => {
                    this.handleChanged();
                };

                // attach HoC origin for external debugging cases
                listener.displayName = this.constructor.displayName;

                const cleanup = fn.call(null, listener, this.__isMounted);
                if(cleanup && isFunction(cleanup)) {
                    unsubs.push(cleanup);
                }
            };

            let observables = watchObservables.call(null, props, manual, context);


            if(isObject(observables) || isArray(observables)) {

                if(!isArray(observables)) {
                    observables = [observables];
                }

                numberSubscribers += observables.length;

                let listener = () => {
                    this.handleChanged();
                };

                // attach HoC origin for external debugging cases
                listener.displayName = this.constructor.displayName;

                let len = observables.length;
                while(len-- > 0) {
                    const observable = observables[len];
                    const unsub = observable.observe(listener);

                    if(!isFunction(unsub)) {
                        continue;
                    }

                    unsubs.push(unsub);
                }
            }

            invariant(unsubs.length >= numberSubscribers,
                `Expected to have at least ${numberSubscribers} cleanup functions for observers. But only received ${unsubs.length} cleanup functions.`);

            // NOTE: `render()` will see the updated state and will be executed
            // only once despite the state change.
            this.setState({
                unsubs: unsubs
            });
        },

        // this function is subscribed to all given observables, and is called whenever
        // any of those observables change in some way.
        handleChanged() {

            if(!this.__isMounted()) {
                return;
            }

            const ctx = assign({}, this.state);

            if(shouldRewatchObservables.call(ctx, this.props, this.context)) {
                this.cleanWatchers();
                this.watch(this.props, this.context);
            }

            this.processProps(this.props, this.context);

        },

        processProps(props, context) {

            const ctx = assign({}, this.state);

            if(!shouldAssignNewProps.call(ctx, props, context)) {
                return;
            }

            let pendingResult;
            try {
                pendingResult = this.assignNewProps(props, context);
            } catch(reason) {

                if(onError) {
                    onError.call(null, reason);
                }

                this.setState({
                    pending: false,
                    pendingResult: void 0,
                    error: reason
                });
            }

            if(isPromise(pendingResult)) {

                this.setState({
                    pending: true,
                    pendingResult: pendingResult,
                    error: void 0

                    // currentProps remain the same since doing something like:
                    // assign({}, this.state.currentProps, props)
                    // and passing it onto child components is the incorrect
                    // approach.
                });

                Promise.resolve(pendingResult)
                    .then((newProps) => {

                        if(!this.mounted || !this.state.pending || this.state.pendingResult !== pendingResult) {
                            // either:
                            // - component unmounted before promise was resolved
                            // - another promise after this one was resolved
                            // - another promise was created and invoked after this one
                            return null;
                        }

                        if(this.state.pendingResult !== pendingResult) {
                            return null;
                        }

                        this.setState({
                            pending: false,
                            pendingResult: void 0,
                            currentProps: assign({}, props, newProps),
                            error: void 0
                        });

                        return null;

                    }, (reason) => {
                        this.setState({
                            error: reason
                        });

                        return null;
                    });

                return;
            }

            this.setState({
                pending: false,
                pendingResult: void 0,
                currentProps: assign({}, props, pendingResult),
                error: void 0
            });
        },

        /* React API */

        displayName: `${Component.displayName}.OrwellContainer`,

        shouldComponentUpdate(nextProps, nextState, nextContext) {

            // note: shouldComponentUpdate() is never called on initial render.
            // whenever it is called, the next render is no longer the initial render.
            this.afterInitialRender = true;

            if(hasProp(inputSpec, 'shouldComponentUpdate')) {
                const ctx = assign({}, this, {props: this.state.currentProps});
                const result = inputSpec.shouldComponentUpdate.call(ctx, nextState.currentProps, nextState, nextContext);
                if(isBool(result)) {
                    return result;
                }
            }

            // optimistic HoC update if pending status differs;
            // useful for case when shallowEqual(this.state.currentProps, nextState.currentProps) as
            // promise begin to resolve or is finishing resolving.
            if(this.state.pending !== nextState.pending) {
                return true;
            }

            return !shallowEqual(this.state.currentProps, nextState.currentProps);
        },

        getInitialState() {

            this.mounted = false;
            this.afterInitialRender = false;

            let pending = true;

            let pendingResult;
            let err = void 0;
            try {
                pendingResult = this.assignNewProps(this.props, this.context);
            } catch(reason) {

                if(onError) {
                    onError.call(null, reason);
                }

                err = reason;
                pendingResult = {};
            }

            let currentProps = void 0;

            if(isPromise(pendingResult)) {
                pending = true;
                currentProps = assign({}, this.props);
            } else {
                pending = false;
                currentProps = assign({}, this.props, pendingResult);
                pendingResult = void 0;
            }

            return {
                // Array of functions to be called when OrwellContainer unmounts.
                // These functions, when called, handle any necessary cleanup step.
                unsubs: [],

                pending: pending,
                pendingResult: pendingResult,
                currentProps: currentProps,
                error: err
            };
        },

        componentWillMount() {

            this.mounted = true;

            // subscribe to observables
            //
            // On initial mount, this.assignNewProps(...) is called before observables
            // are subscribed to prevent an extra render in case this.assignNewProps(...)
            // triggers observables.
            this.watch(this.props, this.context);

            if(!this.state.pending) {

                invariant(this.state.pendingResult === void 0,
                    `Expected this.state.pendingResult to be void 0. Given: ${this.state.pendingResult}`);

                return;
            }

            invariant(isPromise(this.state.pendingResult),
                `Expected this.state.pendingResult to be like a Promise. Given: ${this.state.pendingResult}`);

            Promise.resolve(this.state.pendingResult)
                .then(
                // fulfillment
                (newProps) => {

                    if(!this.mounted) {
                        // component unmounted before promise was resolved
                        return null;
                    }

                    this.setState({
                        pending: false,
                        pendingResult: void 0,
                        currentProps: assign({}, this.props, newProps)
                    });

                    return null;
                },
                // rejection
                (reason) => {

                    if(!this.mounted) {
                        // component unmounted before promise was resolved
                        return null;
                    }

                    if(onError) {
                        onError.call(null, reason);
                    }

                    this.setState({
                        pending: false,
                        pendingResult: void 0,
                        error: reason
                    });

                    return null;
                });

        },

        componentWillUnmount() {
            this.mounted = false;
            this.afterInitialRender = false;
            this.cleanWatchers();
        },

        componentWillReceiveProps(nextProps, nextContext) {

            const ctx = assign({}, this.state);

            if(shouldRewatchObservables.call(ctx, nextProps, nextContext)) {
                this.cleanWatchers();
                this.watch(nextProps, nextContext);
            }

            // TODO: remove
            // // don't resolve a new promise if there is already a resolving promise
            // // using previous props that is (shallowly) equal to the next props.
            // if(this.state.pending && this.state.pendingWithProps !== NOT_SET && shallowEqual(this.state.pendingWithProps, nextProps)) {
            //     return;
            // }

            this.processProps(nextProps, nextContext);

        },

        render() {

            if(this.state.error !== void 0) {
                return (ErrorComponent ? <ErrorComponent {...this.state.currentProps} /> : null);
            }

            if(this.state.pending) {

                // after the initial render on initial mount, if WaitingComponent is not given,
                // then persist Component until props from promise resolves.
                // otherwise, if onlyWaitingOnMount == true, then persist Component after initial render
                if((!WaitingComponent || onlyWaitingOnMount) && this.afterInitialRender) {
                    return (<Component {...this.state.currentProps} />);
                }

                return (WaitingComponent ? <WaitingComponent {...this.state.currentProps} /> : null);

            }

            return (<Component {...this.state.currentProps} />);
        }
    };

    const CourierContainer = React.createClass(assign({}, inputSpec, classSpec));

    return CourierContainer;
};

module.exports = Courier;
