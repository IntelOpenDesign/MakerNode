var fs = require('fs');
var conf = require('../lib/conf').create();
var chai = require('chai'),
  should = chai.should(),
  expect = chai.expect;
var READ_FILE = 'default_appstate.conf';
var WRITE_FILE = '';

describe('Conf()', function() {
  describe('.read()', function() {
    it('* Reads valid JSON from ' + READ_FILE, function(done) {
      conf.read(READ_FILE)
        .then(
          function(state) {
            state.should.have.property('app_mode', 'setup');
            done();
          },
          function(reason) {
            throw ('read error: ' + reason);
          }
      )
    });
  });

  describe('.write()', function() {
    it('* Writes  ' + WRITE_FILE, function(done) {
      fs.createReadStream(READ_FILE).pipe(fs.createWriteStream(READ_FILE + '.temp'));
      conf.write(JSON.stringify({
        test: 'pass'
      }), 'foo.temp')
        .then(
          function(state) {
           /* fs.unlink(READ_FILE + '.temp', function(err) {
              if (err) throw err;
            });*/
            done();
          },
          function(reason) {
            throw ('write error: ' + reason);
          }
      )
    });
  });
});

