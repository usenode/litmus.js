
var litmus = require('../lib/litmus');

exports.test = new litmus.Suite('Litmus Test Suite', [
    require('./assertions').test,
    require('./skipif').test,
    require('./async').test,
    require('./events').test
]);

