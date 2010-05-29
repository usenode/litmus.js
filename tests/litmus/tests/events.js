

pkg.define('litmus_tests_events', ['litmus', 'node:sys'], function (litmus, sys) {
    return new litmus.Test('events tests', function () {
        this.plan(1);

        var test = this;

        var planned = 1;

        var testTest = new litmus.Test('test test', function () {
            this.plan(planned);
        });

        var run = testTest.createRun();

        run.on('plan', function (e) {
            test.is(e.assertions, planned, 'number of planned test as expected');
        });

        var handle = this.async('events handled by onfinish');

        run.finished.then(function () {
            handle.finish();
        });

        run.start();
    });
});

