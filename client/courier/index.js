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

// TODO: this is a fork of orwell; merge into orwell when stable.

/**

orwell({
    component: Component,
    waitingComponent: Waiting,
    errorComponent: ErrorComponent,

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
        return [...];
    },

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

const Courier = function(inputSpec) {

    const onlyWaitingOnMount = _.has(inputSpec, 'onlyWaitingOnMount') ? inputSpec.onlyWaitingOnMount : false;

    const Component = inputSpec.component;
    const WaitingComponent = inputSpec.waitingComponent || null;
    const ErrorComponent = inputSpec.errorComponent || null;

    let shouldAssignNewProps = inputSpec.shouldAssignNewProps || null;
    let assignNewProps = inputSpec.assignNewProps || null;
    let watchObservables = inputSpec.watch || null;
    let shouldRewatchObservables = inputSpec.shouldRewatch || null;

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

    /* create HoC */

    const classSpec = {

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

                const cleanup = fn.call(null, this.handleChanged, this.__isMounted);
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

                const listener = () => {
                    this.handleChanged();
                };

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

            invariant(unsubs.length >= numberSubscribers, `Expected to have at least ${numberSubscribers} cleanup functions for observers. But only received ${unsubs.length} cleanup functions.`);

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

            const pendingResult = this.assignNewProps(props, context);

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
                            return;
                        }

                        if(this.state.pendingResult !== pendingResult) {
                            return;
                        }

                        this.setState({
                            pending: false,
                            pendingResult: void 0,
                            currentProps: assign({}, props, newProps),
                            error: void 0
                        });

                    }, (reason) => {
                        this.setState({
                            error: reason
                        });
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

        shouldComponentUpdate(nextProps, nextState) {

            // note: shouldComponentUpdate() is never called on initial render.
            // whenever it is called, the next render is no longer the initial render.
            this.afterInitialRender = true;

            // optimistic HoC update if pending status differs,
            // since this.state.currentProps == nextState.currentProps as
            // promise begin to resolve or is finishing resolving.
            return (this.state.pending !== nextState.pending ||
            // otherwise compare props
                !shallowEqual(this.state.currentProps, nextState.currentProps));
        },

        getInitialState() {

            this.mounted = false;
            this.afterInitialRender = false;

            let pending = true;
            let pendingResult = this.assignNewProps(this.props, this.context);
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
                error: void 0
            };
        },

        componentWillMount() {

            this.mounted = true;

            // subscribe to observables
            this.watch(this.props, this.context);

            if(!this.state.pending) {

                invariant(this.state.pendingResult === void 0,
                    `Expected this.state.pendingResult to be void 0. Given: ${this.state.pendingResult}`);

                return;
            }


            invariant(isPromise(this.state.pendingResult),
                `Expected this.state.pendingResult to be like a Promise. Given: ${this.state.pendingResult}`);

            Promise.resolve(this.state.pendingResult)
                .then((newProps) => {

                    if(!this.mounted) {
                        // component unmounted before promise was resolved
                        return;
                    }

                    this.setState({
                        pending: false,
                        pendingResult: void 0,
                        currentProps: assign({}, this.props, newProps)
                    });
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

            // TODO: is this needed?
            // Dec 25/15: probably not. but what if assert(shallowequal(this.props, nextProps))?
            // if(this.state.pending) {
            //     return;
            // }

            this.processProps(nextProps, nextContext);

        },

        render() {

            if(this.state.error !== void 0) {
                console.error('Error occured', this.state.error);
                return (ErrorComponent ? <ErrorComponent {...this.state.currentProps} /> : null);
            }




            if(this.state.pending) {

                // after the initial render on initial mount, if WaitingComponent is not given,
                // then persist Component until props from promise resolves.
                if(!WaitingComponent && this.afterInitialRender) {
                    return (<Component {...this.state.currentProps} />);
                }

                if(onlyWaitingOnMount) {
                    if(!this.afterInitialRender) {
                        return (WaitingComponent ? <WaitingComponent {...this.state.currentProps} /> : null);
                    }

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
