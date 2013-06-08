
var litmus = require('../litmus');

module.exports = new litmus.Test(module, function () {

    this.plan(109);

    var returns = [], r = 0;

    var test = this;

    var testedTest = new litmus.Test(
        'test test', function () {

            this.plan(27);

            returns[r++] = this.pass('simplest pass');
            returns[r++] = this.fail('simplest fail');
            
            returns[r++] = this.ok(true, 'boolean check true');
            returns[r++] = this.ok(false, 'boolean check false');

            returns[r++] = this.nok(true, 'not boolean check true');
            returns[r++] = this.nok(false, 'not boolean check false');

            returns[r++] = this.is(1, 1, 'one equals one');
            returns[r++] = this.is(1, 2, 'one does not equal two');

            returns[r++] = this.not(1, 1, 'not one equals one');
            returns[r++] = this.not(1, 2, 'not one does not equal two');
            
            returns[r++] = this.lt(1, 2, 'lt(1, 2) true');
            returns[r++] = this.lt(1, 1, 'lt(1, 1) false')
            returns[r++] = this.lt(2, 1, 'lt(2, 1) false');

            returns[r++] = this.lte(1, 2, 'lte(1, 2) true');
            returns[r++] = this.lte(1, 1, 'lte(1, 1) true');
            returns[r++] = this.lte(2, 1, 'lte(2, 1) false');                        

            returns[r++] = this.gt(1, 2, 'gt(1, 2) false');
            returns[r++] = this.gt(1, 1, 'gt(1, 1) false')
            returns[r++] = this.gt(2, 1, 'gt(2, 1) true');

            returns[r++] = this.gte(1, 2, 'gte(1, 2) false');
            returns[r++] = this.gte(1, 1, 'gte(1, 1) true');
            returns[r++] = this.gte(2, 1, 'gte(2, 1) true');

            returns[r++] = this.like('a', /a/, 'a like /a/');
            returns[r++] = this.like('b', /a/, 'b not like /a/')

            returns[r++] = this.unlike('a', /a/, 'a not unlike /a/');
            returns[r++] = this.unlike('b', /a/, 'b unlike /a/')

            this.pass();
        }
    );

    this.async('wait for test test to finish', function (done) {

        var run = testedTest.createRun();

        run.finished.then(function () {

            test.is(run.assertions().length, 27, 'number of assertions');
            test.nok(run.passed, 'test result with failures is a fail');
            test.ok(run.failed, 'use failed property to check for failure');
            test.is(run.passes(), 14, 'number of passes');
            test.is(run.fails(), 13, 'number of fails');

            var i = -1;

            function testAssertion (assertion, message, passes) {
                test.is(run.events[++i].message, message, 'message for ' + assertion + ' assertion');
                if (passes) {
                    test.ok(run.events[i].passed, assertion + ' passes');
                    test.nok(run.events[i].failed, assertion + ' does not fail');
                    test.ok(returns[i], assertion + ' return value true');
                }
                else {
                    test.nok(run.events[i].passed, assertion + ' does not pass');
                    test.ok(run.events[i].failed, assertion + ' fails');
                    test.nok(returns[i], assertion + ' return value false');
                }
            }

            testAssertion('pass()', 'simplest pass', true);
            testAssertion('fail()', 'simplest fail', false);

            testAssertion('ok(true)', 'boolean check true', true);
            testAssertion('ok(false)', 'boolean check false', false);

            testAssertion('nok(true)', 'not boolean check true', false);
            testAssertion('nok(false)', 'not boolean check false', true);

            testAssertion('is(1, 1)', 'one equals one', true);
            testAssertion('is(1, 2)', 'one does not equal two', false);

            testAssertion('not(1, 1)', 'not one equals one', false);
            testAssertion('not(1, 2)', 'not one does not equal two', true);

            testAssertion('lt(1, 2)', 'lt(1, 2) true', true);
            testAssertion('lt(1, 1)', 'lt(1, 1) false', false);
            testAssertion('lt(2, 1)', 'lt(2, 1) false', false);

            testAssertion('lte(1, 2)', 'lte(1, 2) true', true);
            testAssertion('lte(1, 1)', 'lte(1, 1) true', true);
            testAssertion('lte(2, 1)', 'lte(2, 1) false', false);

            testAssertion('gt(1, 2)', 'gt(1, 2) false', false);
            testAssertion('gt(1, 1)', 'gt(1, 1) false', false);
            testAssertion('gt(2, 1)', 'gt(2, 1) true', true);

            testAssertion('gte(1, 2)', 'gte(1, 2) false', false);
            testAssertion('gte(1, 1)', 'gte(1, 1) true', true);
            testAssertion('gte(2, 1)', 'gte(2, 1) true', true);

            testAssertion('like(\'a\', /a/)', 'a like /a/', true);
            testAssertion('like(\'b\', /a/)', 'b not like /a/', false);

            testAssertion('unlike(\'a\', /a/)', 'a not unlike /a/', false);
            testAssertion('unlike(\'b\', /a/)', 'b unlike /a/', true);

            done.resolve();
        });

        run.start();

    });

});

