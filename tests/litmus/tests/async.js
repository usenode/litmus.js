
pkg.define('litmus_tests_async', ['litmus'], function (litmus) {
    return new litmus.Test('asynchronous tests', function () {
        this.plan(9);

        var test = this;

        var hasSetTimeout = true;

        try {
            eval('setTimeout');
        }
        catch (e) {
            hasSetTimeout = false;
        }


        this.skipif(! hasSetTimeout, 'no setTimeout', 5, function () {

            this.async('onfinish for timeout tests', function (handle) {

                this.is(test, this, 'invocant to async is test');
                this.is(handle.test, this, 'can also get at test from handle');

                var onfinishes = '';

                handle.onfinish(function () {
                    this.is(onfinishes, 'ab', 'all inner onfinishes ran in order added');
                });

                var innerHandle = this.async('testing async timeout');

                innerHandle.onfinish(function () {
                    onfinishes += 'a';
                });

                innerHandle.onfinish(function () {
                    onfinishes += 'b';
                });

                setTimeout(function () {
                    test.pass('async assertion');
                    innerHandle.finish();
                    handle.finish();
                }, 0);
            });

            this.pass('a sync assertion');

        });

        var handle = this.async('testing async calls with no async timeout');

        handle.onfinish(function () {
            this.pass('assertion inside onfinish for non-async');
        });

        this.pass('non-async assertion');

        handle.finish();

        this.async('asynchronous tests with no async timeout from async method', function (handle) {
            this.pass('sync assertion in async');
            handle.finish();
        });


        this.pass('a final sync assertion');
    });
});








