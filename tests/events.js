
var litmus = require('../litmus');

module.exports = new litmus.Test(module, function () {
    this.plan(1);

    var test = this;

    var planned = 1;

    var testTest = new litmus.Test('test test', function () {
        this.plan(planned);
    });

    this.async('events handled by onfinish', function (done) {

        var run = testTest.createRun();

        run.on('plan', function (e) {
            test.is(e.assertions, planned, 'number of planned test as expected');
        });

        run.finished.then(function () {
            done.resolve();
        });

        run.start();
    });
});


