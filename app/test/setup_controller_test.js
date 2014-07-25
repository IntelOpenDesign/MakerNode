var net = require('net');
var setup_controller = require('../lib/setup_controller')();
var client = new net.Socket();
var exec = require('child_process').exec;
var should = require('chai').should();

var HOST = '0.0.0.0';
var PORT = 8001;
var NETSTAT = "netstat -a -n | egrep '" + PORT + ".* LISTEN'"; //TODO: Make this a util method
var setup_state = {};

describe('setup_controller.start()', function() {
  setup_controller.start(PORT);
  it('* Should listen on port ' + PORT, function(done) {
    exec(NETSTAT, function(error, stdout, stderr) {
      stdout.should.not.have.length(0);
      done();
    });
  });
  it('* Client should open', function(done) {
    client.connect(PORT, HOST, function() {
      done();
      client.destroy(); //this initiates the close event
    });

    client.on('data', function(data) {
      //TODO
      console.log('DATA: ' + data);
    });

    client.on('close', function() {
      describe('setup_controller.stop()', function() {
        it('* Socket should close', function(done) {
          setup_controller.on_finished(function() {
            exec(NETSTAT, function(error, stdout, stderr) {
              stdout.should.have.length(0);
              done();
            });
          });
          setup_controller.close();
        });
      });
    });
  });
});
