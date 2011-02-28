
/**
 * @function Make a constructor extend another.
 * Makes a subclass by creating a prototype for the child that shares the
 * prototype of the parent. Addionally sets the base property of the child
 * function to point to the parent function (useful for calling
 * `arguments.callee.base.apply(this, arguments)` in the top of the child
 * function to allow use of parent constructor).
 *
 * @param {Function} child
 *   Child constructor.
 * @param {Function} parent
 *   Parent constructor.
 */

exports.extend = function (child, parent) {
    var p = function () {};
    p.prototype = parent.prototype;
    child.prototype = new p();
    child.base = parent;
};

/**
 * @function Add methods for subscribing to and emitting events on a class.
 * @param {Function} protoClass
 *     prototype to add the methods onto.
 */

exports.makeEventEmitter = function (protoClass) {
    protoClass.prototype.on = function (eventName, callback, invocant) {
        if (! this._eventHandlers) {
            this._eventHandlers = {};
        }
        if (! this._eventHandlers[eventName]) {
            this._eventHandlers[eventName] = [];
        }
        this._eventHandlers[eventName].push(
            invocant ?
                function (e) { return callback.call(invocant, e); } :
                callback
        );
    };
    protoClass.prototype._fireEvent = function (eventName, event) {
        if (! event) {
            event = {};
        }
        event.attachedTo = this;
        if (! (this._eventHandlers && this._eventHandlers[eventName])) {
            return;
        }
        this._eventHandlers[eventName].map(function (handler) {
            handler(event);
        });
    };
}

/**
 * @function Check if an object was created by a constructor or an extention of it.
 * Sees if parameter is an instanceof the constructor or if it
 * is an instanceof a parent class, where parents are identified by following the `base`
 * property on each function (set by extend function).
 *
 * @param {Object} instance
 *   The object that we are testing the type of.
 * @param {Function} isType
 *   The constructor that we are testing the object's type against.
 *
 * @returns: A boolean indicating if object is correct type.
 */

exports.isa = function (instance, isType) {
    return (instance instanceof isType) ? true :
        isType.base ? isa(instance, isType.base) : false;
}

/**
 * @function: Repeat a string a number of times.
 *
 * @param {String} str
 *   The string to repeat.
 * @param {integer} times
 *   The number of times to repeat the string.
 *
 * @returns: The repeated string.
 */

exports.times = function (str, times) {
    var res = new Array(times);
    for (var i = 0; i < times; i++)
        res[i] = str;
    return res.join('');
}

/**
 * @function: Show the structure of a JavaScript value or object.
 *
 * @param {any} o
 *   The value or object to dump the structure of.
 *
 * @returns: A string similar to the Javascript that would be needed to create the value.
 */

exports.dump = function (o, level) {
    if (! level) level = 0;
    if (level > 4) return '...';
    if (typeof(o) === 'undefined') return 'undefined';
    if (typeof(o) === 'number') return o;
    if (typeof(o) === 'function') return 'function () { ... }';
    if (typeof(o) === 'boolean') return o ? 'true' : 'false';
    if (typeof(o) === 'object') {
        var r = ['{'];
        var first = true;
        for (var i in o) {
            if (first) first = false;
            else r.push(', ');
            r.push("'", i, "' : ", dump(o[i], level + 1));
        }
        r.push('}');
        return r.join('');
    }
    o = o.replace(/([\\\'])/g, '\\$1');
    return '\'' + o.replace(/\n/g, '\\n') + '\'';
}

/**
 * @function Get a string with whitespace removed.
 *
 * @param {String} str
 *   The string to return a stripped version of.
 *
 * @returns: A string copy of the input string with no whitespace.
 */

exports.stripWhitespace = function (str) {
    if (typeof(str) === 'undefined') return 'undefined';
    return String(str).replace(/\s+/g, ' ');
}

/**
 * @function Escape the entities in a string and return the result.
 * @param {String} html
 *     The string to be escaped.
 * @returns: The input string with the entities escaped.
 */

exports.escapeHtml = function (html) {
    return html.toString().replace(/([&<>""])/g, function (character) {
        return '&' + (
            character === '&' ? 'amp' :
            character === '<' ? 'lt' :
            character === '>' ? 'gt' : 'quot'
        ) + ';';
    });
}