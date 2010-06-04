/**
 * @fileoverview This file contains the main implementation of the Litmus JavaScript
 *               unit testing framework. Including just this file should be enough
 *               to write most basic unit tests.
 *
 * @author Thomas Yandell
 * @version 0.2
 */

pkg.define('litmus', ['promise'], function (promise) {

   /**
    * @namespace Classes for writing, running and formatting the results of tests and
    *            suites of tests.
    */

    var ns = {};

    var main = this;

    // classes
    var Diagnostic,
        SkippedAssertions,
        Suite,
        SuiteRun,
        Test,
        TestRun,
        AsyncHandle,
        Assertion,
        Pass,
        Fail,
        Ok,
        Nok,
        Is,
        Not,
        Isa,
        Lt,
        Lte,
        Gt,
        Gte,
        Like,
        Unlike,
        Throws,
        Formatter,
        StaticFormatter,
        StaticHtmlFormatter,
        StaticTextFormatter;

    function makeEventEmitter (protoClass) {
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
    * @private
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

    function extend (child, parent) {
        var p = function () {};
        p.prototype = parent.prototype;
        child.prototype = new p();
        child.base = parent;
    }

   /**
    * @private
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

    function isa (instance, isType) {
        return (instance instanceof isType) ? true :
            isType.base ? isa(instance, isType.base) : false;
    }

   /**
    * @private
    * @function: Repeat a string a number of times.
    *
    * @param {String} str
    *   The string to repeat.
    * @param {integer} times
    *   The number of times to repeat the string.
    *
    * @returns: The repeated string.
    */

    function times (str, times) {
        var res = new Array(times);
        for (var i = 0; i < times; i++)
            res[i] = str;
        return res.join('');
    }

   /**
    * @private
    * @function: Show the structure of a JavaScript value or object.
    *
    * @param {any} o
    *   The value or object to dump the structure of.
    *
    * @returns: A string similar to the Javascript that would be needed to create the value.
    */

    function dump (o, level) {
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
    * @private
    * @function Get a string with whitespace removed.
    *
    * @param {String} str
    *   Tthe string to return a stripped version of.
    *
    * @returns: A string copy of the input string with no whitespace.
    */

    function stripWhitespace (str) {
        if (typeof(str) === 'undefined') return 'undefined';
        return String(str).replace(/\s+/g, ' ');
    }

   /**
    * @private
    * @constructor The result of running a litmus.Suite. An instance of this class is
    *              the invocant of the callback that is passed to the `Suite.run` method.
    * 
    * @param {litmus.Suite} suite
    *   The test suite that this is the result of.
    */

    SuiteRun = function (suite) {
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

    makeEventEmitter(SuiteRun);

   /**
    * @method Starts the suite running.
    */
    SuiteRun.prototype.start = function () {
        var finished = [],
            run = this;
        // TODO check this
        promise.all(
            this.suite.tests.map(function (name) {
                return pkg.load(name).then(function (test) {
                    var run = test.createRun();
                    run.start();
                    return run;
                });
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

    Suite = ns.Suite = function (name, tests) {
        this.name = name;
        this.tests = tests;
/*        for (var i = 0, l = tests.length; i < l; i++) {
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
*/
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

    Diagnostic = function (text) {
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

    SkippedAssertions = function (reason, assertions) {
        this.skipped = assertions;
        this.reason = reason;
    };

   /**
    * @private
    * @abstract
    * @constructor Abstract base class for classes representing assertions that have been run.
    *
    * @param {boolean} passed
    *     True if the assertion was successful.
    * @param {String} message
    *    The message that identifies the assertion.
    * @param {String} [extra]
    *    Further information set when the assertion fails that might be useful to track down the error.
    */

    Assertion = function (passed, message, extra) {
        this.isAssertion = true;
        this.message = message;
        this.passed = !! passed;
        this.failed = ! passed;
        this.extra = extra;
    };

   /**
    * @private
    * @extends Assertion
    * @constructor The simplest type of successful assertion - one that always passes.
    *
    * @param {String} message
    *   The message that identifies the assertion.
    */

    Pass = function (message) {
        arguments.callee.base.call(this, true, message);
    };
    extend(Pass, Assertion);

   /**
    * @private
    * @extends Assertion
    * @constructor The simplest type of unsuccessful assertion - one that always fails.
    *
    * @param {String} message
    *   The message that identifies the assertion.
    */

    Fail = function (message) {
        arguments.callee.base.call(this, false, message);
    };
    extend(Fail, Assertion);

   /**
    * @private
    * @extends Assertion
    * @constructor Assertion that passes if a boolean value is true.
    *
    * @param {boolean} cond
    *   True if the assertion was successful.
    * @param {String} message
    *   The message that identifies the assertion.
    */

    Ok = function (cond, message) {
        arguments.callee.base.call(this, cond, message);
    };
    extend(Ok, Assertion);

   /**
    * @private
    * @extends Assertion
    * @constructor Assertion that passes if a boolean value is false.
    *
    * @param {boolean} cond
    *   True if the assertion was unsuccessful.
    * @param {String} message
    *   The message that identifies the assertion.
    */

    Nok = function (cond, message) {
        arguments.callee.base.call(this, ! cond, message);
    };
    extend(Nok, Assertion);

   /**
    * @private
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
    
    Is = function (val, isVal, message) {
        // keep this == instead of === as we want it to be permissive with types
        var passed = val == isVal;
        var extra;
        if (! passed) { // TODO - quote and truncate
            extra = ['\n    expected: ', dump(isVal), '\n         got: ', dump(val)].join('');
        }
        arguments.callee.base.call(this, passed, message, extra);
    };
    extend(Is, Assertion);

   /**
    * @private
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

    Not = function (val, notVal, message) {
        var passed = val != notVal;
        var extra;
        if (! passed) { // TODO - quote and truncate
            extra = "got '" + val + "', expecting something else";
        }
        arguments.callee.base.call(this, passed, message, extra);
    };
    extend(Not, Assertion);

   /**
    * @private
    * @extends Assertion
    * @constructor Assertion that tests if an object is a member of a class. The assertion
    *              passes if the object was created using the function (tested with instanceof)
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

    Isa = function (instance, clss, message) {
        var passed = clss && isa(instance, clss);
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
                      + stripWhitespace(instance.constructor)
                      + '\n       found class: '
                      + stripWhitespace(clss);
            }
        }
        arguments.callee.base.call(this, passed, message, extra);
    };
    extend(Isa, Assertion);

   /**
    * @private
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

    Gt = function (val, gtVal, message) {
        var passed = val > gtVal;
        var extra;
        if (! passed) {
            extra = "expected greater than '" + gtVal + "', got '" + val + "'";
        }
        arguments.callee.base.call(this, passed, message, extra);
    };
    extend(Gt, Assertion);

   /**
    * @private
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

    Gte = function (val, gteVal, message) {
        var passed = val >= gteVal;
        var extra;
        if (! passed) {
            extra = "expected greater or equal to '" + gteVal + "', got '" + val + "'";
        }
        arguments.callee.base.call(this, passed, message, extra);
    };
    extend(Gte, Assertion);

   /**
    * @private
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

    Lt = function (val, ltVal, message) {
        var passed = val < ltVal;
        var extra;
        if (! passed) {
            extra = "expected less than '" + ltVal + "', got '" + val + "'";
        }
        arguments.callee.base.call(this, passed, message, extra);
    };
    extend(Lt, Assertion);

   /**
    * @private
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

    Lte = function (val, lteVal, message) {
        var passed = val <= lteVal;
        var extra;
        if (! passed) {
            extra = "expected less or equal to '" + lteVal + "', got '" + val + "'";
        }
        arguments.callee.base.call(this, passed, message, extra);
    };
    extend(Lte, Assertion);

   /**
    * @private
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

    Like = function (val, re, message) {
        var passed = re.test(val);
        var extra;
        if (! passed) {
            extra = "'" + val + "' does not match regular expression " + re;
        }
        arguments.callee.base.call(this, passed, message, extra);
    };
    extend(Like, Assertion);

   /**
    * @private
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

    Unlike = function (val, re, message) {
        var passed = ! re.test(val);
        var extra;
        if (! passed) {
            extra = "'" + val + "' does matches regular expression " + re;
        }
        arguments.callee.base.call(this, passed, message, extra);
    };
    extend(Unlike, Assertion);

   /**
    * @private
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

    Throws = function (func, re, message) {
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
        arguments.callee.base.call(this, passed, message, extra);
    };
    extend(Throws, Assertion);

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

    TestRun = function (test) {
        this.test = test;
        this.events = [];
        this.asyncHandles = [];
        this.exceptions = [];
        this.finished = new promise.Promise();
        this.state = notStartedState;
    };

    makeEventEmitter(TestRun);

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
            function () {
                run.state = finishedState;
                if (! run.plannedAssertionsRan()) {
                    run.addException(new Error('wrong number of tests ran'));
                }
                if (! run.failed) {
                    run.failed = false;
                    run.passed = true;
                }
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
        this._checkRunning('exception');
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
        this._checkRunning('asynchronous section');
        var handle = new AsyncHandle(desc, asyncTimeout || 10),
            run = this;
        this.asyncHandles.push(handle);
        if (func) {
            func.call(this, handle);
        }
        return handle;
    };

   /**
    * @private
    * @method Get events of a particular type.
    *
    * @param {Function} eventType
    *   The constructor function for the type of events to be returned.
    *
    * @returns An array of matching events.
    */

    TestRun.prototype.eventsOfType = function (eventType) {
        var events = [], event;
        for (var i = 0, l = this.events.length; i < l; i++) {
            event = this.events[i];
            if (isa(event, eventType)) {
                events.push(event);
            }
        }
        return events;
    };

   /**
    * @private
    * @method Get assertions that have been run.
    *
    * @returns An array of Assertion objects.
    */

    TestRun.prototype.assertions = function () {
        return this.eventsOfType(Assertion);
    };

   /**
    * @private
    * @method Get the number of assertions that have been skipped.
    *
    * @returns The number of skipped assertions.
    */

    TestRun.prototype.assertionsSkipped = function () {
        var skippedAssertions = this.eventsOfType(SkippedAssertions), total = 0;
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
        var assertions = this.eventsOfType(Assertion);
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
        var assertions = this.eventsOfType(Assertion);
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

   /**
    * @method Add a simple assertion that always passes to the test result.
    *
    * @param {String} message
    *   The message that identifies the assertion.
    *
    * @returns Boolean, true if the assertion passed - i.e. always true.
    */

    TestRun.prototype.pass = function (message) {
        return this.addAssertion(new Pass(message));
    };

   /**
    * @method Add a simple assertion that always fails to the test result.
    *
    * @param {String} message
    *   The message that identifies the assertion.
    *
    * @returns Boolean, true if the assertion passed - i.e. always false.
    */

    TestRun.prototype.fail = function (message) {
        return this.addAssertion(new Fail(message));
    };

   /**
    * @method Add an assertion that checks a boolean value and passes if it is true.
    *
    * @param {boolean} cond
    *   The condition for the assertion.
    * @param {String} message
    *   The message that identifies the assertion.
    *
    * @returns Boolean, true if the assertion passed.
    */

    TestRun.prototype.ok = function (cond, message) {
        return this.addAssertion(new Ok(cond, message));
    };

   /**
    * @method Add an assertion that checks a boolean value and passes if it is false.
    *
    * @param {Boolean} cond
    *   The condition for the assertion.
    * @param {String} message
    *   The message that identifies the assertion.
    *
    * @returns Boolean, true if the assertion passed.
    */

    TestRun.prototype.nok = function (cond, message) {
        return this.addAssertion(new Nok(cond, message));
    };
    
   /**
    * @method Add an assertion that passes if a value is equal (==) to an expected value.
    *
    * @param {any} val
    *   The value to test.
    * @param {any} isVal
    *   The expected value to test against.
    * @param {String} message
    *   The message that identifies the assertion.
    *
    * @returns Boolean, true if the assertion passed.
    */

    TestRun.prototype.is = function (val, isVal, message) {
        return this.addAssertion(new Is(val, isVal, message)); 
    };

   /**
    * @method Add an assertion that passes if a value is not equal (!=) to an unexpected value.
    *
    * @param {any} val
    *   The value to test.
    * @param {any} notVal
    *   The expected value to test against.
    * @param {String} message
    *   The message that identifies the assertion.
    *
    * @returns Boolean, true if the assertion passed.
    */

    TestRun.prototype.not = function (val, notVal, message) {
        return this.addAssertion(new Not(val, notVal, message));
    };
    
   /**
    * @method Add an assertion that passes if an object is a member of a class. The assertion passes
    *         if the object was created using the function (tested with instanceof) or if it was created
    *         with any of the base classes (those that can be retrieved using the `base` property of the
    *         function and the `base` property of the resulting parent function and so on).
    *
    * @param {Object} instance
    *   The object that is being tested for class membership.
    * @param {Function} clss
    *   The class that the object must be a member of.
    * @param {String} message
    *   The message that identifies the assertion.
    *
    * @returns Boolean, true if the assertion passed.
    */

    TestRun.prototype.isa = function (instance, clss, message) {
        return this.addAssertion(new Isa(instance, clss, message));
    };

   /**
    * @method Add an assertion that passes if a value is greater than another value.
    *
    * @param {String|Number} val
    *   The value that must be greater.
    * @param {String|Number} gtVal
    *   The value that val must be greater than.
    * @param {String|Number} message
    *   The message that identifies the assertion.
    *
    * @returns Boolean, true if the assertion passed.
    */

    TestRun.prototype.gt = function (val, gtVal, message) {
        return this.addAssertion(new Gt(val, gtVal, message));
    };

   /**
    * @method Add an assertion that passes if a value is greater or equal to another value.
    *
    * @param {String|Number} val - (required number or string) the value that must be greater or equal.
    * @param {String|Number} gtVal - (required number of string) the value that val must be greater than or equal to.
    * @param {String|Number} message - (required string) the message that identifies the assertion.
    *
    * @returns boolean, true if the assertion passed.
    */

    TestRun.prototype.gte = function (val, gte, message) {
        return this.addAssertion(new Gte(val, gte, message));
    };

   /**
    * @method Add an assertion that passes if a value is less than another value.
    *
    * @param {String|Number} val
    *   The value that must be greater.
    * @param {String|Number} ltVal
    *   The value that val must be less than.
    * @param {String} message
    *   The message that identifies the assertion.
    *
    * @returns Boolean, true if the assertion passed.
    */

    TestRun.prototype.lt = function (val, lt, message) {
        return this.addAssertion(new Lt(val, lt, message));
    };

   /**
    * @method Add an assertion that passes if a value is less or equal to another value.
    *
    * @param {String|Number} val - (required number or string) the value that must be less or equal.
    * @param {String|Number} ltVal - (required number of string) the value that val must be less than or equal to.
    * @param {String} message
    *   The message that identifies the assertion.
    *
    * @returns Boolean, true if the assertion passed.
    */

    TestRun.prototype.lte = function (val, lte, message) {
        return this.addAssertion(new Lte(val, lte, message));
    };

   /**
    * @method Add an assertion that passes if a value matches a regular expression.
    *
    * @param {String} val
    *   The value that will be matched.
    * @param {RegExp} re
    *   The regular expression to match against.
    * @param {String} message
    *   The message that identifies the assertion.
    *
    * @returns Boolean, true if the assertion passed.
    */

    TestRun.prototype.like = function (val, re, message) {
        return this.addAssertion(new Like(val, re, message));
    };

   /**
    * @method Add an assertion that passes if a value does not match a regular expression.
    *
    * @param {String} val
    *   The value that will be matched.
    * @param {RegExp} re
    *   The regular expression to match against.
    * @param {String} message
    *   The message that identifies the assertion.
    *
    * @returns Boolean, true if the assertion passed.
    */

    TestRun.prototype.unlike = function (val, re, message) {
        return this.addAssertion(new Unlike(val, re, message));
    };

   /**
    * @method Add an assertion that tests if a function raises an exception, and that exception
    *         matches a regular expression.
    *
    * @param {Function} func
    *   The function that will be executed.
    * @param {RegExp} re
    *   The regular expression to match the exception against.
    * @param {String} message
    *   The message that identifies the assertion.
    *
    * @returns Boolean, true if the assertion passed.
    */

    TestRun.prototype.throwsOk = function (func, re, message) {
        return this.addAssertion(new Throws(func, re, message));
    };

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

    AsyncHandle = function (desc, timeout) {
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

    makeEventEmitter(AsyncHandle);

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

    Test = ns.Test = function (name, runFunc) {
        this.name = name;
        this.runFunc = runFunc;
    };

   /**
    * @method Creates and returns a new TestRun for this test.
    */
    Test.prototype.createRun = function () {
        return new TestRun(this);
    };

   /**
    * @private
    * @abstract
    * @constructor Abstract base class for formatters of SuiteRuns and TestRuns.
    */

    Formatter = function () {};

   /**
    * @abstract
    * @extends Formatter
    * @constructor Abstract base class for static formatters of SuiteRuns and TestRuns. Static
    *              formatters are run on SuiteRuns and TestRuns that are complete - i.e. they
    *              create linear output.
    */

    StaticFormatter = ns.StaticFormatter = function () {
        arguments.callee.base.apply(this, arguments);
    };
    extend(StaticFormatter, Formatter);

   /**
    * @method Format a SuiteRun or TestRun by defering to formatSuite or formatTest methods.
    *
    * @param {Array} r
    *   Buffer for collecting output.
    * @param {TestRun|SuiteRun} res
    *   The result to format.
    */

    StaticFormatter.prototype.formatSuiteOrTest = function (r, res) {
        if (res instanceof SuiteRun) {
            this.formatSuite(r, res);
        }
        else {
            this.formatTest(r, res);
        }
    };

   /**
    * @method Formats each of the sub-results in the passed in SuiteRun.
    *
    * @param {Array} buffer
    *   Buffer for collecting output.
    * @param {SuiteRun} res
    *   The SuiteRun to format.
    */

    StaticFormatter.prototype.formatSuite = function (buffer, run) {
        for (var i = 0, l = run.runs.length; i < l; i++) {
            this.formatSuiteOrTest(buffer, run.runs[i]);
        }
    };

    function escapeHtml (html) {
        return html.toString().replace(/([&<>""])/g, function (character) {
            return '&' + (
                character === '&' ? 'amp' :
                character === '<' ? 'lt' :
                character === '>' ? 'gt' : 'quot'
            ) + ';';
        });
    }

   /**
    * @extends extends Static
    * @constructor HTML formatter for finished TestRuns and SuiteRuns.
    */

    StaticHtmlFormatter = ns.StaticHtmlFormatter = function () {
        arguments.callee.base.apply(this, arguments);
    };
    extend(StaticHtmlFormatter, StaticFormatter);

   /**
    * @method Get the passed in TestRun or SuiteRun formatted as html.
    *
    * @param {TestRun|SuiteRun} res
    *   The result to be formatted.
    *
    * @returns String - the formatted html.
    */

    StaticHtmlFormatter.prototype.format = function (res) {
        var r = [];
        r.push(
            '<div class="slouch-result">',
            '<h1>Litmus Test Result</h1>',
            '<p>Result: <span>',
            res.passed ? 'PASS' : 'FAIL',
            '</span></p></div>'
        );

        this.formatSuiteOrTest(r, res);

        return r.join('');
    };

   /**
    * @private
    * @method Get passed in TestRun formatted as html.
    *
    * @param {Array} r
    *   Buffer for collecting output.
    * @param {TestRun} res
    *   The TestRun to format.
    */

    StaticHtmlFormatter.prototype.formatTest = function (r, res) {
        r.push(
            '<div class="litmus-test-result">',
            '<h2>', escapeHtml(res.test.name), '</h2>'
        );
        if (res.error) {
            r.push('<p class="error">An exception was encountered while running the test. See below.</p>');
        }

        if (res.plannedAssertionsRan()) {
            r.push('<p class="count">Assertions: ', res.assertions().length, '</p>');
        }
        else {
            r.push(
                '<p class="count-error">',
                'Assertions count error. Planned ',
                escapeHtml(res.planned),
                ' assertions, but ran ',
                res.assertions().length,
                '.</p>'
            );
        }
        r.push(
            '<p>Passes: ',
            res.passes(),
            ', Fails: ',
            res.fails(),
            '</p><ul class="assertions">'
        );
        for (var i = 0, l = res.events.length; i < l; i++) {
            var event = res.events[i];
            if (event instanceof Diagnostic) {
                r.push('<li class="diagnostic">', escapeHtml(event.text), '</li>');
            }
            else if (event instanceof SkippedAssertions) {
                r.push(
                    '<li class="assertions-skipped"><span class="status">[ SKIPPED ]</span>  ',
                    escapeHtml(event.skipped),
                    ' assertions skipped - ',
                    escapeHtml(event.reason),
                    '</li>'
                );
            }
            else {
                r.push(
                    '<li class="',
                    event.passed ? 'assertion-pass' : 'assertion-fail',
                    '"><span class="status">[ ',
                    event.passed ? 'PASS' : 'FAIL',
                    ' ]</span> ', escapeHtml(event.message),
                    event.extra ? [
                        ' - <span class="extra">',
                        escapeHtml(event.extra),
                        '</span>'
                    ].join('') : '',
                    '</li>'
                );
            }
        }
        if (res.error) {
            r.push('<li class="assertion-error"><span class="status">[ ERROR ]</span> ', escapeHtml(res.error), '</li>');
        }
        r.push('</ul></div>');
    };

   /**
    * @extends Static
    * @constructor Plain text formatter for finished TestRuns and SuiteRuns.
    */

    StaticTextFormatter = ns.StaticTextFormatter = function () {
        arguments.callee.base.apply(this, arguments);
    };
    extend(StaticTextFormatter, StaticFormatter);

   /**
    * @method Get the passed in TestRun or SuiteRun formatted as plain text.
    *
    * @param {TestRun|SuiteRun} run
    *   The suite or test run to be formatted.
    *
    * @returns String - the formatted plain text.
    */

    StaticTextFormatter.prototype.format = function (run) {
        var buffer = [];
        buffer.push(
            'Litmus Test Result\n',
            '====================\n\n',
            'Result: ',
            run.passed ? 'PASS' : 'FAIL',
            '\n\n'
        );

        this.formatSuiteOrTest(buffer, run);

        buffer.push(
            'Summary\n',
            '=======\n\n',
            run.passed ? 'PASS' : 'FAIL',
            '\n'
        );

        return buffer.join('');
    };

   /**
    * @private
    * @method Get passed in TestRun formatted as plain text.
    *
    * @param {Array} buffer
    *   Buffer for collecting output.
    * @param {TestRun} run
    *   The TestRun to format.
    */

    StaticTextFormatter.prototype.formatTest = function (buffer, run) {
        buffer.push(
            run.test.name, '\n',
            times('-', run.test.name.length), '\n\n'
        );
        if (run.exceptions.length === 1) {
            buffer.push('An exception was encountered while running the test. See below.\n\n');
        }
        else if (run.exceptions.length > 1) {
            buffer.push('Exceptions were encountered while running the test. See below.\n\n');
        }
        if (run.plannedAssertionsRan()) {
            buffer.push('Assertions: ', run.assertions().length, '\n');
        }
        else {
            buffer.push(
                '!!! Assertions count error. Planned ',
                run.planned,
                ' assertions, but ran ',
                run.assertions().length,
                ' !!!\n\n'
            );
        }
        buffer.push(
            'Passes: ',
            run.passes(),
            ', Fails: ',
            run.fails(),
            '\n\n'
        );
        for (var i = 0, l = run.events.length; i < l; i++) {
            var event = run.events[i];
            if (event instanceof Diagnostic) {
                buffer.push(
                    '# ', event.text, '\n'
                );
            }
            else if (event instanceof SkippedAssertions) {
                buffer.push(
                    '[ SKIPPED ] ',
                    event.skipped,
                    ' assertions skipped - ',
                    event.reason,
                    '\n'
                );
            }
            else {
                buffer.push(
                    '[ ',
                        event.passed ? 'PASS' : 'FAIL',
                    ' ] ',
                    event.message,
                    event.extra ? ' (' + event.extra + ')' : '',
                    '\n'
                );
            }
        }
        for (var i = 0, l = run.exceptions.length; i < l; i++) {
            buffer.push('\n[ ERROR ] ', run.exceptions[i].message, '\n');
        }
        buffer.push('\n');
    };

    return ns;
});

