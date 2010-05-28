

pkg.define('litmus_tests_events', ['litmus'], function (litmus) {
    return new litmus.Test('events tests', function () {
        this.plan(1);

        var test = this;

        var planned = 1;

        var testTest = new litmus.Test('test test', function () {
            this.plan(planned);
        });

        testTest.on('plan', function (e) {
            test.equals(e.number, planned, 'number of planned test as expected');
        });

        test.async('events handled by onfinish', function (handle) {
            testTest.run(function () {
                handle.finish();
            });
        });

    });
});

