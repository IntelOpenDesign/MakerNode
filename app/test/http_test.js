var http = require('../lib/http')();
var exec = require('child_process').exec;
var should = require('chai').should();

var HOST = '127.0.0.1';
var PORT = 1234;
var NETSTAT = "netstat -a -n | egrep '" + PORT + ".* LISTEN'";

describe('HTTP.listen()', function() {
  http.listen(PORT);
  it('* Listen on port ' + PORT, function(done) {
    exec(NETSTAT, function(error, stdout, stderr) {
      stdout.should.not.have.length(0);
      done();
    });
  });
  it('* Should load valid index.html', function(done) {
    require('http').request({
        host: HOST,
        port: PORT
      },
      function(response) {
        var str = '';
        response.on('data', function(chunk) {
          str += chunk;
        });
        response.on('end', function() {
          str.should.have.string('<!DOCTYPE html>');
          done();
          describe('HTTP.close()', function() {
            http.close(PORT);
            it('* Should not listen on port ' + PORT, function(done) {
              exec(NETSTAT, function(error, stdout, stderr) {
                stdout.should.have.length(0);
                done();
              });
            });
          });

        });
      }
    ).end();
  });
});
