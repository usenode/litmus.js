/**
 * @fileoverview This file contains the main implementation of the Litmus JavaScript
 *               unit testing framework. Including just this file should be enough
 *               to write most basic unit tests.
 *
 * @author Thomas Yandell
 */

var promise    = require('promised-io/promise'),
    sys        = require('sys'),
    utils      = require('litmus/utils'),
    assertions = require('litmus/assertions');

/**
 * @namespace Classes for writing, running and formatting the results of tests and
 *            suites of tests.
 */

/**
 * @private
 * @constructor The result of running a litmus.Suite. An instance of this class is
 *              the invocant of the callback that is passed to the `Suite.run` method.
 * 
 * @param {litmus.Suite} suite
 *   The test suite that this is the result of.
 */

var SuiteRun = exports.SuiteRun = function (suite) {
    this.suite = suite;
    this.finished = new promise.Promise();
    var run = this;
    this.finished.then(function (runs) {
        run.runs = runs;
        run.failed = ! (run.passed = runs.every(function (run) {
            return run.passed;
        }));
        run._fireEvent('finish');
    });
};

utils.makeEventEmitter(SuiteRun);

/**
 * @method Starts the suite running.
 */

SuiteRun.prototype.start = function () {
    var finished = [],
        run = this;
    // TODO check this
    promise.all(
        this.suite.tests.map(function (test) {
            var run = test.createRun();
            run.start();
            return run;
        })
    ).then(function (runs) {
        promise.when(
            promise.all(runs.map(function (run) { return run.finished; })),
            function () {
                run.finished.resolve(runs);
            }
        );
    });
};

/**
 * @constructor Collection of tests.
 *
 * @param {String} name
 *   A readable name for the test suite.
 * @param {Array of litmus.Test and litmus.Suite objects} tests
 *   The tests that make up the suite.
 */

var Suite = exports.Suite = function (name, tests) {
    this.name = name;
    this.tests = tests;
      for (var i = 0, l = tests.length; i < l; i++) {
        if (! tests[i]) {
            throw new Error('litmus: test ' +
                i +
                ' passed to new litmus.Suite() undefined'
            );
        }
        else if (! (tests[i] instanceof Suite || tests[i] instanceof Test)) {
            throw new Error('litmus: test ' +
                i +
                ' passed to new litmus.Suite() not litmus.Test or litmus.Suite'
            );
        }
    }
    // TODO - why slice? Add explanation
    this.tests = tests.slice();

};

/**
 * @method Create and reutrn a new SuiteRun for this suite.
 */

Suite.prototype.createRun = function () {
    return new SuiteRun(this);
};

/**
 * @private
 * @method Get an iterator function for getting tests in the suite.
 *
 * @returns A function that returns a litmus.Test each time it is called until there are no
 *          more left in the suite.
 */

Suite.prototype.testIterator = function () {
    var i = 0, subIterator, that = this;
    return function () {
        var test;
        if (subIterator && (test = subIterator()))
            return test;
        if (i >= that.tests.length) return;
        test = that.tests[i++];
        if (test instanceof Test) return test;
        subIterator = test.testIterator();
        return arguments.callee();
    };
};

/**
 * @private
 * @constructor A diagnostic message.
 *
 * @param {String} text
 *   The text of the diagnostic.
 */

var Diagnostic = exports.Diagnostic = function (text) {
    this.text = text;
};

/**
 * @private
 * @constructor A number of assertions that are skipped during a test.
 *
 * @param {String} reason
 *   Why the assertions were skipped.
 * @param {integer} assertions
 *   The number of assertions that were skipped.
 */

var SkippedAssertions = exports.SkippedAssertions = function (reason, assertions) {
    this.skipped = assertions;
    this.reason = reason;
};

/**
 * @private
 * @name TestRun
 * @constructor The result of running a test. TestRuns are not constructed explicitly by
 *              user's code (the constructor so they can't be) but are used as the invocant
 *              for a test's run function. The run function for the test then uses the
 *              TestRun to add assertions to.
 *
 * @param {Test} test
 *   The Test that this is a result for.
 * @param {Function} onfinish
 *   A callback that will be invoked when the test is finished and the result ready.
 */

var notStartedState = 1,
    runningState    = 2,
    finishedState   = 3;

var TestRun = function (test) {
    this.test = test;
    this.events = [];
    this.asyncHandles = [];
    this.exceptions = [];
    this.finished = new promise.Promise();
    this.state = notStartedState;
};

utils.makeEventEmitter(TestRun);

/**
 * @method Runs the test running with the TestRun as the invocant.
 */

TestRun.prototype.start = function () {
    this.state = runningState;
    var run = this;
    this._fireEvent('start');
    try {
        this.test.runFunc.call(this);
    }
    catch (e) {
        var location = (e.fileName ? ' at ' + e.fileName + ' line ' + e.lineNumber : '');
        new Error('error in "' + this.test.name + '" test - ' + (e.message || e) + location + (e.stack ? '\n' + e.stack : ''));
        this.addException(new Error('error in "' + this.test.name + '" test - ' + (e.message || e) + location + (e.stack ? '\n' + e.stack : '')));
    }
    promise.when(
        promise.all(this.asyncHandles.map(function (handle) {
            return handle.finished;
        })),
        function (results) {
            for (var i = 0, l = results.length; i < l; i++) {
                if (typeof(results[i]) !== 'undefined') {
                    run.addException(results[i]);
                }
            }
            if (! run.plannedAssertionsRan()) {
                run.addException(new Error('wrong number of tests ran'));
            }
            if (! run.failed) {
                run.failed = false;
                run.passed = true;
            }
            run.state = finishedState;
            run.finished.resolve();
        }
    );
};

TestRun.prototype._failRun = function (reason) {
    this.passed = false;
    this.failed = true;
    this._fireEvent('fail', reason);
};

/**
 * @method Check the test is running and throw an appropriate exception otherwise.
 *
 * @param {string} what
 *   The thing being set/added to the test run.
 */

TestRun.prototype._checkRunning = function (what) {
    if (this.state === notStartedState) {
        throw new Error(what + ' added to test run before it was started');
    }
    else if (this.state === finishedState) {
        throw new Error(what + ' added to test run after it was finished');
    }
};

/**
 * @method Set an exception caught running the test.
 *
 * @param {object} exception
 *   The exception that was caught.
 */

TestRun.prototype.addException = function (exception) {
    this._checkRunning('exception (' + (exception.message || exception) + ')');
    this.exceptions.push(exception);
    this._failRun(exception);
};

/**
 * @method Set the expected number of assertions that will be run in this test.
 *
 * @param {integer} assertions
 *   The number of assertions expected.
 */

TestRun.prototype.plan = function (assertions) {
    this._checkRunning('plan');
    this._fireEvent('plan', { 'assertions' : assertions });
    this.planned = assertions;
};

/**
 * @method Add a diagnostic message to the result.
 *
 * @param {String} text
 *   The text of the diagnostic message.
 */

TestRun.prototype.diag = function (text) {
    this._checkRunning('diagnostic');
    this.events.push(new Diagnostic(text));
};

/**
 * @method Skip a number of tests if a condition is met. This is mainly used to not run tests
 *         on environments that do not support specific features.
 *
 * @param {boolean} cond
 *   Assertions are skipped if true.
 * @param {String} reason
 *   Description why the tests are being skipped.
 * @param {integer} skipped
 *    The number of assertions being skipped - must match the number of assertions executed by
 *    the func parameter.
 * @param {Function} func
 *   Function that contains the assertions that may be skipped. This is only called if the cond parameter
 *   is true and is called with the TestRun as it's invocant.
 */

TestRun.prototype.skipif = function (cond, reason, skipped, tests) {
    this._checkRunning('skipped assertions');
    if (cond) {
        this.events.push(new SkippedAssertions(reason, skipped));
    }
    else {
        tests.call(this);
    }
};

/**
 * @method Run tests inside an anonymous function asynchronously. Use either this method or startAsync.
 *
 * @param {String} desc
 *   An identifier for the async execution, so that if end is not called on the handle supplied to the
 *   passed function via the handle parameter, the offending async tests can be found.
 * @param {Function} func
 *   A function that is invoked on the test result (i.e. you can run assertions by calling methods on
 *   this) and is passed an async handle as it's first parameter. The end method should be called on this
 *   handle when the async tests have finished.
 *
 * @returns The return value from the passed in function.
 */

TestRun.prototype.async = function (desc, func, asyncTimeout) {
    if (typeof(desc) !== 'string') {
        throw new Error('desc prarameter to async method must be a string (' + typeof(desc) + ' found)');
    }
    if (typeof(func) === 'number' && arguments.length == 2) {
        asyncTimeout = func;
        func = null;
    }
    if (func && typeof(func) !== 'function') {
        throw new Error('func prarameter to async method must be a function (' + typeof(desc) + ' found)');
    }
    this._checkRunning('asynchronous section');
    var handle = new AsyncHandle(desc, asyncTimeout || 4),
        run = this;
    this.asyncHandles.push(handle);
    if (func) {
        func.call(this, handle);
    }
    return handle;
};

/**
 * @private
 * @method Get assertions that have been run.
 *
 * @returns An array of Assertion objects.
 */

TestRun.prototype.assertions = function () {
    var assertions = [];
    for (var i = 0, l = this.events.length; i < l; i++) {
        if (this.events[i].isAssertion) {
            assertions.push(this.events[i]);
        }
    }
    return assertions;
};

/**
 * @private
 * @method Get skipped assertions
 *
 * @returns An array of SkippedAssertions objects.
 */

TestRun.prototype.skippedAssertions = function () {
    var skippedAssertions = [];
    for (var i = 0, l = this.events.length; i < l; i++) {
        if (this.events[i] instanceof SkippedAssertions) {
            skippedAssertions.push(this.events[i]);
        }
    }
    return skippedAssertions;
};

/**
 * @private
 * @method Get the number of assertions that have been skipped.
 *
 * @returns The number of skipped assertions.
 */

TestRun.prototype.assertionsSkipped = function () {
    var skippedAssertions = this.skippedAssertions(),
        total = 0;
    for (var i = 0, l = skippedAssertions.length; i < l; i++) {
        total += skippedAssertions[i].skipped;
    }
    return total;
};

/**
 * @private
 * @method Check if the number of assertions ran and skipped are the same as those planned.
 *
 * @returns Boolean, true if the correct number of assertions ran.
 */

TestRun.prototype.plannedAssertionsRan = function () {
    return typeof(this.planned) === 'undefined' ||
           this.planned === (this.assertionsSkipped() + this.assertions().length);
};

/**
 * @private 
 * @method Get the number of assertions that passed.
 *
 * @returns Number of assertions that passed.
 */

TestRun.prototype.passes = function () {
    var total = 0;
    var assertions = this.assertions();
    for (var i = 0, l = assertions.length; i < l; i++) {
        if (assertions[i].passed) total++;
    }
    return total;
};

/**
 * @private
 * @method Get the number of assertions that failed.
 *
 * @returns Number of assertions that failed.
 */

TestRun.prototype.fails = function () {
    var total = 0;
    var assertions = this.assertions();
    for (var i = 0, l = assertions.length; i < l; i++) {
        if (assertions[i].failed) total++;
    }
    return total;
};

/**
 * @private
 * @method Add an assertion to the result's events.
 *
 * @param {Assertion} assertion
 *   The assertion event to add.
 *
 * @returns Boolean, true if the assertion passed.
 */

TestRun.prototype.addAssertion = function (assertion) {
    this._checkRunning('assertion');
    this.events.push(assertion);
    if (! assertion.passed) {
        this._failRun(assertion);
    }
    return assertion.passed;
};

function mixinAssertionType (proto, name, AssertionType) {
    proto[name] = function () {
        var assertion = new AssertionType();
        this.events.push(assertion);
        assertion.run.apply(assertion, arguments);
    };
}

for (var name in assertions.builtins) {
    mixinAssertionType(TestRun.prototype, name, assertions.builtins[name]);
}

/**
 * @private
 * @name AsyncHandle
 * @constructor A handle that is returned from the TestRun.async method and passed to it's optinal
 *              function parameter. This is used to indicate when the asynchronous tests have finished.
 *
 * @param {TestRun} run
 *   The test run that the asynchronous assertions are adding to.
 * @param {String} desc
 *   The description of the async tests.
 */

var AsyncHandle = function (desc, timeout) {
    this.finished = new promise.Promise();
    var handle = this;
    this._timeout = setTimeout(function () {
        delete handle._timeout;
        handle.finished.reject(new Error('async operation "' + desc + '" timed out after ' + timeout + ' seconds'));
    }, timeout * 1000);
    this.finished.then(function () {
        if (handle._timeout) {
            clearTimeout(handle._timeout);
        }
    });
};

utils.makeEventEmitter(AsyncHandle);

/**
 * @method Indicate that a set of asynchronous tests have finished.
 */

AsyncHandle.prototype.finish = function () {
    this.finished.resolve();
};

/**
 * @constructor A named collection of assertions for testing an area of functionality.
 *
 * @param {String} name
 *   The name of the test.
 * @param {Function} runFunc
 *   The function performs the testing. This is called as a result of calling the run method and is
 *   invoked with a TestRun object as it's invocant, which has methods to test assertions.
 */

var Test = exports.Test = function (name, runFunc) {
    this.name = name;
    this.runFunc = runFunc;
};

/**
 * @method Creates and returns a new TestRun for this test.
 */
Test.prototype.createRun = function () {
    return new TestRun(this);
};

