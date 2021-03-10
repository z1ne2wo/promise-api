const utils = require('./utils');

const PENDING = 0;
const FULFILLED = 1;
const REJECTED = 2;

function resolve(promise, value) {
    if (promise === value) {
        return promise._reject(new TypeError('Chaining cycle detected'));
    }

    let called = false;

    try {
        const then = value && value.then;
        const isTarget = utils.isObject(value) || utils.isFunction(value);

        if (isTarget && utils.isFunction(then)) {
            then.call(
                value,
                (value) => {
                    if (!called) {
                        resolve(promise, value);
                        called = true;
                    }
                },
                (reason) => {
                    if (!called) {
                        promise._reject(reason);
                        called = true;
                    }
                }
             );
        } else {
            promise._fulfill(value);
        }
    } catch (err) {
        if (!called) {
            promise._reject(err);
            called = true;
        }
    }
}

class AggregateError extends Error {
  constructor(errors, message) {
      super(message);

      Object.defineProperty(this, 'errors', {
          value: errors,
          writable: true,
          configurable: true
      });
  }
}

class Promise {
    constructor(execute) {
        this._state = PENDING;
        this._queue = new utils.Queue();

        try {
            execute && execute(
                (value) => {
                    resolve(this, value);
                },
                (reason) => {
                    this._reject(reason);
                }
            );
        } catch (err) {
            this._reject(err);
        }
    }

    then(onFulfilled, onRejected) {
        return this._chain(onFulfilled, onRejected);
    }

    catch(onRejected) {
        return this._chain(null, onRejected);
    }

    finally(onFulfilled) {
        return this._chain(
            (value) => Promise.resolve(onFulfilled()).then(() => {
                return value;
            }),
            (reason) => Promise.resolve(onFulfilled()).then(() => {
                throw reason;
            })
        );
    }

    static resolve(value) {
        return new Promise((resolve) => {
            resolve(value);
        });
    }

    static reject(reason) {
        return new Promise((resolve, reject) => {
            reject(reason);
        });
    }

    static all(promises) {
        promises = utils.map(promises, utils.identity);

        if (!promises.length) return Promise.resolve([]);

        return new Promise((resolve, reject) => {
            let resolved = 0;
            const result = [];

            promises.forEach((promise, index) => {
                Promise.resolve(promise).then(
                    (value) => {
                        resolved += 1;
                        result[index] = value;

                        if (resolved === promises.length) {
                            resolve(result);
                        }
                    },
                    reject
                );
            });
        });
    }

    static allSettled(promises) {
        return Promise.all(
            utils.map(promises, (promise) =>
                Promise.resolve(promise).then(
                    (value) => ({status: 'fulfilled', value}),
                    (reason) => ({status: 'rejected', reason})
                )
            )
        );
    }

    static any(promises) {
        return Promise.all(
            utils.map(promises, (promise) =>
                Promise.resolve(promise).then(Promise.reject, utils.identity)
            )
        ).then(
            (errors) => {
                throw new AggregateError(errors, 'All promises were rejected');
            },
            utils.identity
        );
    }

    static race(promises) {
        return new Promise((resolve, reject) => {
            utils.each(promises, (promise) => {
                Promise.resolve(promise).then(resolve, reject);
            });
        });
    }

    _chain(onFulfilled, onRejected) {
        const promise = new Promise();

        promise._onFulfilled = utils.isFunction(onFulfilled) ? onFulfilled : utils.identity;
        promise._onRejected = utils.isFunction(onRejected) ? onRejected : utils.throwFn;

        this._queue.enqueue(promise);
        if (this._state !== PENDING) {
            this._flushQueue();
        }

        return promise;
    }

    _fulfill(value) {
        this._transition(FULFILLED, value);
    }

    _reject(reason) {
        this._transition(REJECTED, reason);
    }

    _transition(state, value) {
        if (this._state !== PENDING) return;

        this._state = state;
        this._value = value;

        this._flushQueue();
    }

    _flushQueue() {
        utils.defer(() => {
            while (this._queue.size) {
                const promise = this._queue.dequeue();
                const callback = promise[this._state === FULFILLED ? '_onFulfilled' : '_onRejected'];

                try {
                    resolve(promise, callback(this._value))
                } catch (err) {
                    promise._reject(err);
                }
            }
        });
    }
}

exports.AggregateError = AggregateError;
exports.Promise = Promise;
