
var utils = require('./utils');

/**
 * @abstract
 * @constructor Abstract base class for classes representing assertions that have been run.
 *
 * @param {String} message
 *    The message that identifies the assertion.
 */

var addAssertionTo = exports.addAssertionTo = function (to, name, run) {
    var Assertion = function () {};
    Assertion.prototype.isAssertion = true;
    Assertion.prototype.run = run;
    Assertion.prototype.setResult = function (message, passed, extra) {
        this.message = message;
        this.passed  = passed;
        this.failed  = ! passed;
        this.extra   = extra;
    };
    Assertion.prototype.toString = function () {
        return 'test.' + name + '(..., "' + this.message + '")';
    };
    to[name] = Assertion;
};

exports.builtins = {};

/**
 * @extends Assertion
 * @constructor The simplest type of successful assertion - one that always passes.
 *
 * @param {String} message
 *   The message that identifies the assertion.
 */

addAssertionTo(exports.builtins, 'pass', function (message) {
    this.setResult(message, true);
    return true;
});

/**
 * @extends Assertion
 * @constructor The simplest type of unsuccessful assertion - one that always fails.
 *
 * @param {String} message
 *   The message that identifies the assertion.
 */

addAssertionTo(exports.builtins, 'fail', function (message) {
    this.setResult(message, false);
    return false;
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

addAssertionTo(exports.builtins, 'ok', function (pass, message) {
    this.setResult(message, pass);
    return !! pass;
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

addAssertionTo(exports.builtins, 'nok', function (fail, message) {
    this.setResult(message, ! fail);
    return ! fail;
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

addAssertionTo(exports.builtins, 'is', function (val, isVal, message) {
    // keep this == instead of === as we want it to be permissive with types
    var passed = val == isVal || utils.dump(val, -10) === utils.dump(isVal, -10);
    var extra;
    if (! passed) { // TODO - quote and truncate
        extra = ['\n    expected: ', utils.dump(isVal), '\n         got: ', utils.dump(val)].join('');
    }
    this.setResult(message, passed, extra);
    return passed;
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

addAssertionTo(exports.builtins, 'not', function (val, notVal, message) {
    var passed = val != notVal;
    var extra;
    if (! passed) { // TODO - quote and truncate
        extra = "got '" + val + "', expecting something else";
    }
    this.setResult(message, passed, extra);
    return passed;
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

addAssertionTo(exports.builtins, 'isa', function (instance, clss, message) {
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
    return passed;
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

addAssertionTo(exports.builtins, 'gt', function (val, gtVal, message) {
    var passed = val > gtVal;
    var extra;
    if (! passed) {
        extra = "expected greater than '" + gtVal + "', got '" + val + "'";
    }
    this.setResult(message, passed, extra);
    return passed;
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

addAssertionTo(exports.builtins, 'gte', function (val, gtVal, message) {
    var passed = val >= gtVal;
    var extra;
    if (! passed) {
        extra = "expected greater than or equal to '" + gtVal + "', got '" + val + "'";
    }
    this.setResult(message, passed, extra);
    return passed;
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

addAssertionTo(exports.builtins, 'lt', function (val, ltVal, message) {
    var passed = val < ltVal;
    var extra;
    if (! passed) {
        extra = "expected less than '" + ltVal + "', got '" + val + "'";
    }
    this.setResult(message, passed, extra);
    return passed;
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

addAssertionTo(exports.builtins, 'lte', function (val, lteVal, message) {
    var passed = val <= lteVal;
    var extra;
    if (! passed) {
        extra = "expected less or equal to '" + lteVal + "', got '" + val + "'";
    }
    this.setResult(message, passed, extra);
    return passed;
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

addAssertionTo(exports.builtins, 'like', function (val, re, message) {
    var passed = re.test(val);
    var extra;
    if (! passed) {
        extra = "'" + val + "' does not match regular expression " + re;
    }
    this.setResult(message, passed, extra);
    return passed;
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

addAssertionTo(exports.builtins, 'unlike', function (val, re, message) {
    var passed = ! re.test(val);
    var extra;
    if (! passed) {
        extra = "'" + val + "' does matches regular expression " + re;
    }
    this.setResult(message, passed, extra);
    return passed;
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

addAssertionTo(exports.builtins, 'throwsOk', function (func, re, message) {
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
        var asString = error.toString ? error.toString() : error;
        passed = re.test(asString);
        if (! passed) {
            extra = 'exception "' + asString + '" does not match regular expression ' + re;
        }
    }
    this.setResult(message, passed, extra);
    return passed;
});

