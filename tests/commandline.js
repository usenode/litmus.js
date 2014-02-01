
var litmus = require('../litmus');

module.exports = new litmus.Test(module, function () {

    var test = this,
        commandline = require('../lib/commandline');

    test.async('commandline backwards compatibility', function (done) {

        commandline.runStatic(__dirname, [null, null, './compatibility.js']);
        test.pass('Commandline runner can load modules with previous API (exports.module.test)');
        done.resolve();

    });
});