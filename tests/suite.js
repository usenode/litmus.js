
var litmus = require('../lib/litmus');

module.exports = new litmus.Suite(module, [
    require('./assertions'),
    require('./skipif'),
    require('./async'),
    require('./events')
]);
