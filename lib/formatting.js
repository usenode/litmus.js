
var utils = require('litmus/utils');

/**
 * @private
 * @abstract
 * @constructor Abstract base class for formatters of SuiteRuns and TestRuns.
 */

var Formatter = function () {};

/**
 * @abstract
 * @extends Formatter
 * @constructor Abstract base class for static formatters of SuiteRuns and TestRuns. Static
 *              formatters are run on SuiteRuns and TestRuns that are complete - i.e. they
 *              create linear output.
 */

var StaticFormatter = exports.StaticFormatter = function () {
    arguments.callee.base.apply(this, arguments);
};
utils.extend(StaticFormatter, Formatter);

/**
 * @method Format a SuiteRun or TestRun by defering to formatSuite or formatTest methods.
 *
 * @param {Array} r
 *   Buffer for collecting output.
 * @param {TestRun|SuiteRun} res
 *   The result to format.
 */

StaticFormatter.prototype.formatSuiteOrTest = function (r, res) {
    if (res instanceof SuiteRun) {
        this.formatSuite(r, res);
    }
    else {
        this.formatTest(r, res);
    }
};

/**
 * @method Formats each of the sub-results in the passed in SuiteRun.
 *
 * @param {Array} buffer
 *   Buffer for collecting output.
 * @param {SuiteRun} res
 *   The SuiteRun to format.
 */

StaticFormatter.prototype.formatSuite = function (buffer, run) {
    for (var i = 0, l = run.runs.length; i < l; i++) {
        this.formatSuiteOrTest(buffer, run.runs[i]);
    }
};

/**
 * @extends extends Static
 * @constructor HTML formatter for finished TestRuns and SuiteRuns.
 */

StaticHtmlFormatter = exports.StaticHtmlFormatter = function () {
    arguments.callee.base.apply(this, arguments);
};
utils.extend(StaticHtmlFormatter, StaticFormatter);

/**
 * @method Get the passed in TestRun or SuiteRun formatted as html.
 *
 * @param {TestRun|SuiteRun} res
 *   The result to be formatted.
 *
 * @returns String - the formatted html.
 */

StaticHtmlFormatter.prototype.format = function (res) {
    var r = [];
    r.push(
        '<div class="slouch-result">',
        '<h1>Litmus Test Result</h1>',
        '<p>Result: <span>',
        res.passed ? 'PASS' : 'FAIL',
        '</span></p></div>'
    );

    this.formatSuiteOrTest(r, res);

    return r.join('');
};

/**
 * @private
 * @method Get passed in TestRun formatted as html.
 *
 * @param {Array} r
 *   Buffer for collecting output.
 * @param {TestRun} res
 *   The TestRun to format.
 */

StaticHtmlFormatter.prototype.formatTest = function (r, res) {
    r.push(
        '<div class="litmus-test-result">',
        '<h2>', escapeHtml(res.test.name), '</h2>'
    );
    if (res.error) {
        r.push('<p class="error">An exception was encountered while running the test. See below.</p>');
    }

    if (res.plannedAssertionsRan()) {
        r.push('<p class="count">Assertions: ', res.assertions().length, '</p>');
    }
    else {
        r.push(
            '<p class="count-error">',
            'Assertions count error. Planned ',
            escapeHtml(res.planned),
            ' assertions, but ran ',
            res.assertions().length,
            '.</p>'
        );
    }
    r.push(
        '<p>Passes: ',
        res.passes(),
        ', Fails: ',
        res.fails(),
        '</p><ul class="assertions">'
    );
    for (var i = 0, l = res.events.length; i < l; i++) {
        var event = res.events[i];
        if (event instanceof Diagnostic) {
            r.push('<li class="diagnostic">', escapeHtml(event.text), '</li>');
        }
        else if (event instanceof SkippedAssertions) {
            r.push(
                '<li class="assertions-skipped"><span class="status">[ SKIPPED ]</span>  ',
                escapeHtml(event.skipped),
                ' assertions skipped - ',
                escapeHtml(event.reason),
                '</li>'
            );
        }
        else {
            r.push(
                '<li class="',
                event.passed ? 'assertion-pass' : 'assertion-fail',
                '"><span class="status">[ ',
                event.passed ? 'PASS' : 'FAIL',
                ' ]</span> ', escapeHtml(event.message),
                event.extra ? [
                    ' - <span class="extra">',
                    escapeHtml(event.extra),
                    '</span>'
                ].join('') : '',
                '</li>'
            );
        }
    }
    if (res.error) {
        r.push('<li class="assertion-error"><span class="status">[ ERROR ]</span> ', escapeHtml(res.error), '</li>');
    }
    r.push('</ul></div>');
};

/**
 * @extends Static
 * @constructor Plain text formatter for finished TestRuns and SuiteRuns.
 */

var StaticTextFormatter = exports.StaticTextFormatter = function () {
    arguments.callee.base.apply(this, arguments);
};
utils.extend(StaticTextFormatter, StaticFormatter);

/**
 * @method Get the passed in TestRun or SuiteRun formatted as plain text.
 *
 * @param {TestRun|SuiteRun} run
 *   The suite or test run to be formatted.
 *
 * @returns String - the formatted plain text.
 */

StaticTextFormatter.prototype.format = function (run) {
    var buffer = [];
    buffer.push(
        'Litmus Test Result\n',
        '====================\n\n',
        'Result: ',
        run.passed ? 'PASS' : 'FAIL',
        '\n\n'
    );

    this.formatSuiteOrTest(buffer, run);

    buffer.push(
        'Summary\n',
        '=======\n\n',
        run.passed ? 'PASS' : 'FAIL',
        '\n'
    );

    return buffer.join('');
};

/**
 * @private
 * @method Get passed in TestRun formatted as plain text.
 *
 * @param {Array} buffer
 *   Buffer for collecting output.
 * @param {TestRun} run
 *   The TestRun to format.
 */

StaticTextFormatter.prototype.formatTest = function (buffer, run) {
    buffer.push(
        run.test.name, '\n',
        times('-', run.test.name.length), '\n\n'
    );
    if (run.exceptions.length === 1) {
        buffer.push('An exception was encountered while running the test. See below.\n\n');
    }
    else if (run.exceptions.length > 1) {
        buffer.push('Exceptions were encountered while running the test. See below.\n\n');
    }
    if (run.plannedAssertionsRan()) {
        buffer.push('Assertions: ', run.assertions().length, '\n');
    }
    else {
        buffer.push(
            '!!! Assertions count error. Planned ',
            run.planned,
            ' assertions, but ran ',
            run.assertions().length,
            ' !!!\n\n'
        );
    }
    buffer.push(
        'Passes: ',
        run.passes(),
        ', Fails: ',
        run.fails(),
        '\n\n'
    );
    for (var i = 0, l = run.events.length; i < l; i++) {
        var event = run.events[i];
        if (event instanceof Diagnostic) {
            buffer.push(
                '# ', event.text, '\n'
            );
        }
        else if (event instanceof SkippedAssertions) {
            buffer.push(
                '[ SKIPPED ] ',
                event.skipped,
                ' assertions skipped - ',
                event.reason,
                '\n'
            );
        }
        else {
            buffer.push(
                '[ ',
                    event.passed ? 'PASS' : 'FAIL',
                ' ] ',
                event.message,
                event.extra ? ' (' + event.extra + ')' : '',
                '\n'
            );
        }
    }
    for (var i = 0, l = run.exceptions.length; i < l; i++) {
        buffer.push('\n[ ERROR ] ', run.exceptions[i].message, '\n');
    }
    buffer.push('\n');
};


