
pkg.define('litmus_commandline', ['litmus', 'node:sys'], function (litmus, sys) {

   /**
    * Namespace: litmus_commandline - Litmus running on the command-line.
    *
    * Functions for running tests and formatting results on the command-line.
    */

    var ns = {};

    // mapping of short aliases to full option names
    var shortAliases = {
        '-h' : '--help',
        '-I' : '--include'
    };

    // help messages for each option
    var docs = {
        '--help' : 'Display this help'
    };

    // functions for handling options with arguments
    var optionHandlers = {
        '--include' : function (option, remainingOptions) {
            var include = remainingOptions.shift();
            if (! include) {
                throw 'litmus: ' + option + ' must have an include path passed';
            }
            var match = include.match(/^(\w+(?:_\w+)*):((?:\.{1,2}|\w+)(?:\/(?:\w+|\.|\.{1,2}))*)$/);
            if (! match) {
                throw 'litmus: ' + option + ' must be of the form package_prefix:path/prefix';
            }
            this.lib[match[1]] = match[2];
        }
    };

   /**
    * Private class: Args
    *
    * The arguments that were passed to the command-line program.
    *
    * Constructor arguments:
    *   argv - (required array) array of arguments specified on the command-line.
    */

    var Args = function (argv) {
        argv.shift();
        argv.shift();
        var arg;
        this.pkgs = [];
        this.lib = {};
        while (typeof(arg = argv.shift()) != 'undefined') {
            if (arg.charAt(0) == '-') {
                this.processOption(arg, argv);
            }
            else {
                this.pkgs.push(arg);
            }
        }
        for (var i in this.lib) {
            pkg.lib(this.lib[i], i);
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
    *   argv - (required array) the arguments passed to the command-line program.
    */

    ns.runStatic = function (argv) {
        var args = new Args(argv);
        var tests = args.pkgs,
            test;

        var formatter = new litmus.StaticTextFormatter();

        for (var i = 0, l = tests.length; i < l; i++) {
            test = tests[i];
            pkg.load(test, function (test) {
                var run = test.createRun();
                run.finished.then(function () {
                    sys.print(formatter.format(run));
                });
                run.start();
            });
        }
    };

    return ns;
});

