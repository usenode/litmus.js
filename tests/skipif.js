
var litmus = require('litmus'),
    sys    = require('sys');

exports.test = new litmus.Test('skipif', function () {
    this.plan(7);

    var skippedRan, notSkippedRan;

    var test = this;

    var testedTest = new litmus.Test('tested test', function () {
        this.plan(5);

        this.skipif(true, 'test skip', 3, function () {
            skippedRan = true;
            this.pass('skipped 1');
            this.fail('skipped 2');
            this.pass('skipped 3');
        });

        this.skipif(false, 'test not skip', 2, function () {
            notSkippedRan = true;
            this.pass('not skipped 1');
            this.pass('not skipped 2');
        });
    });

    var run = testedTest.createRun();

    var handle = this.async('wait for test test to finish');

    run.finished.then(function () {

        test.ok(run.plannedAssertionsRan(), 'ran the planned number of assertions');

        sys.debug(' -- ' + sys.inspect(run.passed));
        test.ok(run.passed, 'test with skipped fails passes');

        test.is(run.events.length, 3, 'test has three events');

        test.is(run.events[0].skipped, 3, 'first event is three skipped assertions');
        test.ok(run.events[1].isAssertion, 'second event is an Assertion');
        test.ok(run.events[2].isAssertion, 'third event is an Assertion');

        test.is(run.events[0].reason, 'test skip', 'SkippedAssertion has reason');
        
        handle.finish();
    });

    run.start();
});


