const iterate = require('iterate-value');

function defer(fn) {
    return setTimeout(fn);
}

function identity(value) {
    return value;
}

function throwFn(reason) {
    throw reason;
}

function isObject(value) {
    return Boolean(value) && typeof value === "object";
}

function isFunction(value) {
    return typeof value === 'function';
}

function each(iterable, callback) {
    return iterate(iterable, callback);
}

function map(iterable, callback) {
    return iterate(iterable).map(callback);
}

class Queue {
    size = 0

    enqueue(value) {
        this.size += 1;

        if (this.head) {
            this.tail.next = {value};
            this.tail = this.tail.next;
        } else {
            this.head = this.tail = {value};
        }
    }

    dequeue() {
        this.size -= 1;

        const {value} = this.head;
        this.head = this.head.next;

        return value;
    }
}

module.exports = {defer, identity, throwFn, isObject, isFunction, each, map, Queue};
