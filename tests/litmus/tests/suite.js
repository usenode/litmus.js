
pkg.define(
    'litmus_tests_suite',
    ['litmus', 'litmus_tests_assertions', 'litmus_tests_skipif', 'litmus_tests_async', 'litmus_tests_events'],
    function (litmus, litmus_tests_assertions, litmus_tests_skipif, litmus_tests_async, litmus_tests_events) {
        return new litmus.Suite('Litmus Test Suite', [
            litmus_tests_assertions, litmus_tests_skipif, litmus_tests_async, litmus_tests_events
        ]);
    }
);

