
var litmus = require('../litmus'),
    utils  = require('./utils');

/**
 * @function Escape the entities in a string and return the result.
 * @param {String} html
 *     The string to be escaped.
 * @returns: The input string with the entities escaped.
 */

escapeHtml = function (html) {
    if (! html) {
        return "";
    }

    // FIXME added some crazy comment markers to fix bug in amdtools conversion
    return html.toString().replace(/([&<>"/*"*/])/g, function (character) { //"
       
        return '&' + (
            character === '&' ? 'amp' :
            character === '<' ? 'lt' :
            character === '>' ? 'gt' : 'quot'
        ) + ';';
    });
}

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
    if (res instanceof litmus.SuiteRun) {
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
        '<p>Assertions: ',
        res.passes(),
        ' passed, ',
        res.fails(),
        ' failed.</p><ul class="assertions">'
    );
    for (var i = 0, l = res.events.length; i < l; i++) {
        var event = res.events[i];
        if (event instanceof litmus.Diagnostic) {
            r.push('<li class="diagnostic">', escapeHtml(event.text), '</li>');
        }
        else if (event instanceof litmus.SkippedAssertions) {
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
        '==================\n\n',
        'Result: ',
        setColour(run.passed ? 'green' : 'red'),
        run.passed ? 'PASS' : 'FAIL',
        unsetColour(),
        '\n\n'
    );

    this.formatSuiteOrTest(buffer, run);

    buffer.push(
        'Summary\n',
        '=======\n\nResult:\n    ',
        setColour(run.passed ? 'green' : 'red'),
        run.passed ? 'PASS' : 'FAIL',
        '\n\n',
        unsetColour()
    );

    return buffer.join('');
};

function setColour (colour) {
    var colours = {
        'red'       : 31,
        'green'     : 32,
        'yellow'    : 33,
        'blue'      : 34,
        'magenta'   : 35,
        'cyan'      : 36
    };
    if (! colours[colour]) {
        throw new Error('unknown colour ' + colour);
    }
    return '\033[' + colours[colour] + 'm';
}

function unsetColour () {
    return '\033[39m';
}

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
        utils.times('-', run.test.name.length), '\n\n'
    );
    if (! run.plannedAssertionsRan()) {
        buffer.push(
            setColour('red'),
            '[ ERROR ] Planned ',
            run.planned,
            ' assertion' + (run.planned === 1 ? '' : 's') + ' but ',
            run.assertions().length,
            ' were encountered',
            unsetColour(),
            '\n\n'
        );
    }
    buffer.push(
        setColour('yellow'),
        '[ INFO ] Assertions: ',
        run.passes(),
        ' passed, ',
        run.fails(),
        ' failed',
        unsetColour(),
        '\n'
    );
    if (run.events.length) {
        buffer.push('\n');
    }
    for (var i = 0, l = run.events.length; i < l; i++) {
        var event = run.events[i];
        if (event instanceof litmus.Diagnostic) {
            buffer.push(
                '# ', event.text, '\n'
            );
        }
        else if (event instanceof litmus.SkippedAssertions) {
            buffer.push(
                setColour('cyan'),
                '[ SKIPPED ] ',
                event.skipped,
                ' assertions skipped - ',
                event.reason,
                unsetColour(),
                '\n'
            );
        }
        else {
            buffer.push(
                setColour(event.passed ? 'green' : 'red'),
                '[ ',
                    event.passed ? 'PASS' : 'FAIL',
                ' ] ',
                event.message,
                event.extra ? ' (' + event.extra + ')' : '',
                unsetColour(),
                '\n'
            );
        }
    }
    for (var i = 0, l = run.exceptions.length; i < l; i++) {
        buffer.push('\n' + setColour('red') + '[ ERROR ] ', run.exceptions[i].message || run.exceptions[i], unsetColour(), '\n');
    }
    buffer.push('\n');
};


