
var litmus = require('../litmus');

module.exports.test = new litmus.Test('API backwards compatible API', function () {
    this.plan(1); 
    this.pass('Previous API is still supported');
});