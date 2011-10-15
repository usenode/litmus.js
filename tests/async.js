
var litmus = require('../lib/litmus');

exports.test = new litmus.Test('asynchronous tests', function () {
    this.plan(7);

    var test = this;

    var hasSetTimeout = true;

    try {
        eval('setTimeout');
    }
    catch (e) {
        hasSetTimeout = false;
    }


    this.skipif(! hasSetTimeout, 'no setTimeout', 2, function () {

        this.async('onfinish for timeout tests', function (handle) {

            this.is(test, this, 'invocant to async is test');

            this.async('testing async timeout', function (innerHandle) {

                setTimeout(function () {
                    test.pass('async assertion');
                    innerHandle.finish();
                    handle.finish();
                }, 0);

            });

        });

        this.pass('a sync assertion');

    });

    var returnedHandle = this.async('testing async calls with no async timeout', function (handle) {

        this.pass('non-async assertion');

        // TODO replace with test for null/undefined return value when deprecation is complete
        this.throwsOk(function () {
            returnedHandle.finish();
        }, /deprecated/, 'deprecation notice thrown');

        handle.finish();
    });

    this.async('asynchronous tests with no async timeout from async method', function (handle) {
        this.pass('sync assertion in async');
        handle.finish();
    });


    this.pass('a final sync assertion');
});









