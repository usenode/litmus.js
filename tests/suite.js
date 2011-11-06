
var litmus = require('../lib/litmus');

module.exports = new litmus.Suite('Litmus Test Suite', [
    require('./assertions'),
    require('./skipif'),
    require('./async'),
    require('./events')
]);
