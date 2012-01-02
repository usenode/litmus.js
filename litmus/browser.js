define(['../litmus', '../lib/formatting', 'domReady'], function (litmus, formatting, domReady) {

   /**
    * Namespace: litmus.browser - Litmus running in a browser
    *
    * Functions for running tests and formatting results in a browser.
    */

    var ns = {};

    var body = document.getElementsByTagName('body')[0];

   /**
    * Private function: addToBody
    *
    * Format a TestResult/SuiteResult and add it to the document body.
    */

    function addToBody (run) {
        var formatter = new formatting.StaticHtmlFormatter();
        var element = document.createElement('div');
        element.setAttribute('class', 'litmus-results');
        element.innerHTML = formatter.format(run);
        document.body.appendChild(element);
    }

   /**
    * Private function: getTests
    *
    * Get an array containing the the Suites and Tests passed on the query or the default.
    *
    * Arguments:
    *   defaultTest - (required string) name of the test package to run.
    *
    * Returns: an array of test package names to run.
    */

    function getTests (defaultTest) {
        if (location.search) {
            var tests = location.search.substr(1).split('&');
            for (var i = 0, l = tests.length; i < l; i++) {
                if (! /^\w+(?:\.\w+)*$/.test(tests[i])) {
                    throw 'invalid package name passed on query string: ' + tests[i];
                }
            }
            return tests;
        }
        else {
            return [defaultTest];
        }
    }

   /**
    * Function: runStatic
    *
    * Run and format the results of suites and tests. The default Suite or Test
    * is passed in and can be overridden by specifying them in the query string
    * separated by &'s. For example, if the page is index.html, then the tests
    * can be specified by loading "index.html?my.test1&my.suite1".
    *
    * Arguments:
    *   defaultTest - (required string) name of the test package to run.
    */

    ns.runStatic = function (defaultTest) {

        var tests = getTests(defaultTest);

        for (var i = 0, l = tests.length; i < l; i++) {
            require([tests[i]], function (test) {
                ns.run(test);
            });
        }
    };

    ns.run = function (test) {
        var run = test.createRun();
        run.finished.then(function () {
            domReady(function () {
                addToBody(run);    
            });
        });
        run.start();
    }

    return ns;
});
