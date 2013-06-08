
var litmus = require('../litmus');

module.exports = new litmus.Test(module, function () {
    this.plan(5);

    var test = this;

    var hasSetTimeout = true;

    try {
        eval('setTimeout');
    }
    catch (e) {
        hasSetTimeout = false;
    }


    this.skipif(! hasSetTimeout, 'no setTimeout', 2, function () {

        this.async('onfinish for timeout tests', function (done) {

            this.is(test, this, 'invocant to async is test');

            this.async('testing async timeout', function (innerDone) {

                setTimeout(function () {
                    test.pass('async assertion');
                    innerDone.resolve();
                    done.resolve();
                }, 0);

            });

        });

        this.pass('a sync assertion');

    });

    this.async('asynchronous tests with no async timeout from async method', function (done) {
        this.pass('sync assertion in async');
        done.resolve();
    });


    this.pass('a final sync assertion');
});









