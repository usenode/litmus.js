
pkg.define('litmus_tests_skipif', ['litmus'], function (litmus) {
    return new litmus.Test('skipif', function () {
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

        testedTest.run(function () {

            test.ok(this.plannedAssertionsRan(), 'ran the planned number of assertions');

            test.ok(this.passed, 'test with skipped fails passes');

            test.is(this.events.length, 3, 'test has three events');

            test.is(this.events[0].skipped, 3, 'first event is three skipped assertions');
            test.ok(this.events[1].isAssertion, 'second event is an Assertion');
            test.ok(this.events[2].isAssertion, 'third event is an Assertion');

            test.is(this.events[0].reason, 'test skip', 'SkippedAssertion has reason');

        });
    });
});

