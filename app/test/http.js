var http = require('../lib/http')();
var exec = require('child_process').exec;
var chai = require('chai'),
  should = chai.should(),
  expect = chai.expect;

var PORT = 1234;
var NETSTAT = "netstat -a -n | egrep '" + PORT + ".* LISTEN'";

describe('HTTP', function() {
  describe('#listen()', function() {
    http.listen(PORT);
    it('should listen on port ' + PORT, function(done) {
      exec(NETSTAT, function(error, stdout, stderr) {
        expect(stdout).to.not.have.length(0);
        done();
      });
    });
    it('should load valid index.html', function(done) {
      require('http').request({
          host: '0.0.0.0',
          port: PORT
        },
        function(response) {
          var str = '';
          response.on('data', function(chunk) {
            str += chunk;
          });
          response.on('end', function() {
            expect(str).to.have.string('<!DOCTYPE html>');
            done();
            test_close();

          });
        }
      ).end();
    });
  });
});

function test_close() {
  describe('#close()', function() {
    http.close(PORT);
    it('should not listen on port ' + PORT, function(done) {
      exec(NETSTAT, function(error, stdout, stderr) {
        expect(stdout).to.have.length(0);
        done();
      });
    });
  });
}
