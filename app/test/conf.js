var conf = require('../lib/conf').create();
var chai = require('chai'),
  should = chai.should(),
  expect = chai.expect;
var FILE = 'default_appstate.conf';

describe('Conf.read()', function() {
  it('* Reads ' + FILE, function(done) {
    conf.read(FILE)
      .then(
        function(state) {
          state.should.have.property('app_mode', 'setup');
          done();
        },
        function(reason) {
          throw('read error: ' + reason);
        }
    )
  });

});
