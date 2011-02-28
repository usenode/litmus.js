
var utils = require('litmus/utils');

/**
 * @abstract
 * @constructor Abstract base class for classes representing assertions that have been run.
 *
 * @param {String} message
 *    The message that identifies the assertion.
 */

var makeAssertion = exports.makeAssertion = function (run) {
    var Assertion = function () {};
    Assertion.prototype.isAssertion = true;
    Assertion.prototype.run = run;
    Assertion.prototype.setResult = function (message, passed, extra) {
        this.message = message;
        this.passed  = passed;
        this.failed  = ! passed;
        this.extra   = extra;
    };
    return Assertion;
};

exports.builtins = {};

/**
 * @extends Assertion
 * @constructor The simplest type of successful assertion - one that always passes.
 *
 * @param {String} message
 *   The message that identifies the assertion.
 */

exports.builtins.pass = makeAssertion(function (message) {
    this.setResult(message, true);
});

/**
 * @extends Assertion
 * @constructor The simplest type of unsuccessful assertion - one that always fails.
 *
 * @param {String} message
 *   The message that identifies the assertion.
 */

exports.builtins.fail = makeAssertion(function (message) {
    this.setResult(message, false);
});

/**
 * @extends Assertion
 * @constructor Assertion that passes if a boolean value is true.
 *
 * @param {boolean} cond
 *   True if the assertion was successful.
 * @param {String} message
 *   The message that identifies the assertion.
 */

exports.builtins.ok = makeAssertion(function (pass, message) {
    this.setResult(message, pass);
});

/**
 * @extends Assertion
 * @constructor Assertion that passes if a boolean value is false.
 *
 * @param {boolean} cond
 *   True if the assertion was unsuccessful.
 * @param {String} message
 *   The message that identifies the assertion.
 */

exports.builtins.nok = makeAssertion(function (message, fail) {
    this.setResult(message, ! fail);
});

/**
 * @extends Assertion
 * @constructor Assertion that passes if a value equals (==) another value.
 *
 * @param {any} val
 *   Value being tested.
 * @param {any} isVal
 *   The value that val must equal.
 * @param {String} message
 *   The message that identifies the assertion.
 */

exports.builtins.is = makeAssertion(function (message, val, isVal) {
    // keep this == instead of === as we want it to be permissive with types
    var passed = val == isVal;
    var extra;
    if (! passed) { // TODO - quote and truncate
        extra = ['\n    expected: ', dump(isVal), '\n         got: ', dump(val)].join('');
    }
    this.setResult(message, passed, extra);
});

/**
 * @extends Assertion
 * @constructor Assertion that passes if a value does not equal (!=) another value.
 *
 * @param {any} val
 *   Value being tested.
 * @param {any} notVal
 *   The value that val must not equal.
 * @param {String} message
 *   The message that identifies the assertion.
 */

exports.builtins.not = makeAssertion(function (message, val, isVal) {
    var passed = val != notVal;
    var extra;
    if (! passed) { // TODO - quote and truncate
        extra = "got '" + val + "', expecting something else";
    }
    this.setResult(message, passed, extra);
});

/**
 * @extends Assertion
 * @constructor Assertion that tests if an object is a member of a class. The assertion
 *              passes if the object was created using the function clss,
 *              or if it was created with any of the base classes (those that can be
 *              retrieved using the `base` property of the function and the `base` property
 *              of the resulting parent function and so on).
 *
 * @param {Object} instance 
 *   The object that is being tested for class membership.
 * @param {Function} clss
 *   The class that the object must be a member of.
 * @param {String} message
 *   The message that identifies the assertion.
 */

exports.builtins.isa = makeAssertion(function (message, instance, clss) {
    var passed = clss && utils.isa(instance, clss);
    var extra = '';
    if (! passed) {
        if (typeof(instance) === 'undefined') {
            extra = '\n    instance is undefined';
        }
        else if (typeof(clss) === 'undefined') {
            extra = '\n    class is undefined';
        }
        else if (! passed) {
            extra = '\n    expected class: '
                  + utils.stripWhitespace(instance.constructor)
                  + '\n       found class: '
                  + utils.stripWhitespace(clss);
        }
    }
    this.setResult(message, passed, extra);
});

/**
 * @extends Assertion
 * @constructor Assertion that tests if a value is greater than another value.
 *
 * @param {String|Number} val
 *   The value that must be greater.
 * @param {String|Number} gtVal
 *   The value that val must be greater than.
 * @param {String} message
 *   The message that identifies the assertion.
 */

exports.builtins.gt = makeAssertion(function (message, val, gtVal) {
    var passed = val > gtVal;
    var extra;
    if (! passed) {
        extra = "expected greater than '" + gtVal + "', got '" + val + "'";
    }
    this.setResult(message, passed, extra);
});

/**
 * @extends Assertion
 * @constructor Assertion that tests if a value is greater than or equal to another value.
 *
 * @param {String|Number} val
 *   The value that must be greater or equal.
 * @param {String|Number} gteVal
 *   The value that val must be greater than or equal to.
 * @param {String} message
 *   The message that identifies the assertion.
 */

exports.builtins.gte = makeAssertion(function (message, val, gtVal) {
    var passed = val >= gtVal;
    var extra;
    if (! passed) {
        extra = "expected greater than or equal to '" + gtVal + "', got '" + val + "'";
    }
    this.setResult(message, passed, extra);
});

/**
 * @extends Assertion
 * @constructor Assertion that tests if a value is less than another value.
 *
 * @param {String|Number} val
 *   The value that must be less.
 * @param {String|Number}
 *   The value that val must be less than.
 * @param {String|Number} message
 *   The message that identifies the assertion.
 */

exports.builtins.lt = makeAssertion(function (message, val, ltVal) {
    var passed = val < ltVal;
    var extra;
    if (! passed) {
        extra = "expected less than '" + ltVal + "', got '" + val + "'";
    }
    this.setResult(message, passed, extra);
});

/**
 * @extends Assertion
 * @constructor Assertion that tests if a value is less than or equal to another value.
 *
 * @param {String|Number} val
 *   The value that must be less or equal.
 * @param {String|Number} lteVal
 *   The value that val must be less than or equal to.
 * @param {String|Number} message
 *   The message that identifies the assertion.
 */

exports.builtins.lte = makeAssertion(function (message, val, ltVal) {
    var passed = val <= lteVal;
    var extra;
    if (! passed) {
        extra = "expected less or equal to '" + lteVal + "', got '" + val + "'";
    }
    this.setResult(message, passed, extra);
});

/**
 * @extends Assertion
 * @constructor Assertion that tests if a value matches a regular expression.
 *
 * @param {String} val
 *   The value that will be matched.
 * @param {RegExp} re
 *   The regular expression to match against.
 * @param {String} message
 *   The message that identifies the assertion.
 */

exports.builtins.like = makeAssertion(function (message, val, re) {
    var passed = re.test(val);
    var extra;
    if (! passed) {
        extra = "'" + val + "' does not match regular expression " + re;
    }
    this.setResult(message, passed, extra);
});

/**
 * @extends Assertion
 * @constructor Assertion that tests if a value does not match a regular expression.
 *
 * @param {String} val
 *   The value that will be matched.
 * @param {RegExp} re
 *   The regular expression to match against.
 * @param {String} message
 *   The message that identifies the assertion.
 */

exports.builtins.unlike = makeAssertion(function (message, val, re) {
    var passed = ! re.test(val);
    var extra;
    if (! passed) {
        extra = "'" + val + "' does matches regular expression " + re;
    }
    this.setResult(message, passed, extra);
});

/**
 * @extends Assertion
 * @constructor Assertion that tests if a function raises an exception, and that exception
 *              matches a regular expression.
 *
 * @param {Function} func
 *   The function that will be executed.
 * @param {RegExp} re
 *   The regular expression to match the exception against.
 * @param {String} message
 *   The message that identifies the assertion.
 */

exports.builtins.throwsOk = makeAssertion(function (message, func, re) {
    var passed = true, error, extra;
    try {
        func();
    }
    catch (e) {
        error = e;
    }
    if (! error) {
        passed = false;
        extra = 'no exception thrown';
    }
    else if (re) {
        passed = re.test(error.toString ? error.toString() : error);
        if (! passed) {
            extra = 'exception does not match regular expression';
        }
    }
    this.setResult(message, passed, extra);
});