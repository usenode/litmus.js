
var litmus     = require('../litmus'),
    formatting = require('./formatting'),
    utils      = require('./utils'),
    util       = require('util');

/**
 * Namespace: litmus/commandline - Litmus running on the command-line.
 *
 * Functions for running tests and formatting results on the command-line.
 */

// mapping of short aliases to full option names
var shortAliases = {
    '-h' : '--help'
//    '-I' : '--include'
};

// help messages for each option
var docs = {
    '--help' : 'Display this help'
};

// functions for handling options with arguments
var optionHandlers = {
/*    '--include' : function (option, remainingOptions) {
        var include = remainingOptions.shift();
        if (! include) {
            throw new Error('litmus: ' + option + ' must have an include path passed');
        }
        var match = include.match(/^(\w+(?:_\w+)*):(.+)$/);
        if (! match) {
            throw new Error('litmus: ' + option + ' must be of the form package_prefix:path/prefix');
        }
        this.lib[match[1]] = match[2];
    }
*/
};

/**
 * Private class: Args
 *
 * The arguments that were passed to the command-line program.
 *
 * Constructor arguments:
 *   argv - (required array) array of arguments specified on the command-line (will not be modified).
 */

var Args = function (cwd, argv) {
    argv = argv.slice(0);
    argv.shift();
    argv.shift();
    var arg;
    this.tests = [];
    while (typeof(arg = argv.shift()) != 'undefined') {
        if (arg.charAt(0) == '-') {
            this.processOption(arg, argv);
        }
        else {
            this.tests.push(utils.makeAbsolutePath(cwd, arg));
        }
    }
};

/**
 * Private method: processOption
 *
 * Processes any arguments that an option takes.
 *
 * Arguments:
 *   option           - (required string) the option.
 *   remainingOptions - (required array) the command line options that follow option.
 */
Args.prototype.processOption = function (option, remainingOptions) {
    var fullOption = shortAliases[option] || option;
    var handler = optionHandlers[fullOption];
    if (! handler) {
        throw new Error('litmus: unknown option ' + option);
    }
    handler.call(this, fullOption, remainingOptions);
};

/**
 * Function: runStatic
 *
 * Run the Suites/Tests and format the results.
 *
 * Arguments:
 *   argv - (required array) the arguments passed to the command-line program (will not be modified).
 */
exports.runStatic = function (cwd, argv) {
    var args = new Args(cwd, argv);
    var tests = args.tests,
        test;

    var formatter = new formatting.StaticTextFormatter();

    for (var i = 0, l = tests.length; i < l; i++) {
        test = tests[i];
        var module = require(test);
        var run = getLitmusForModule(module).createRun();
        run.finished.then(function () {
            util.print(formatter.format(run));
        });
        run.start();
    }
};

/**
 * Find the litmus.Test or litmus.Suite for a module.
 * Previous versions of litmus expected this to be exposed under a 'test' key.
 */
function getLitmusForModule (module) {

    if (isLitmus(module)) {
        return module;
    }

    if (module.test && isLitmus(module.test)) {
        return module.test;
    }

    throw new Error('litmus: expected module to export litmus.Test or litmus.Suite');
}

function isLitmus (module) {
    return (module.constructor == litmus.Test || module.constructor == litmus.Suite)
}