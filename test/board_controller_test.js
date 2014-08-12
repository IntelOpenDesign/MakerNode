var io = require('socket.io-client');
var exec = require('child_process').exec;
var should = require('chai').should();

var network_utils = require('../lib/network_utils')();

var client;
var HOST = 'localhost';
var PORT = 8002;
var NETSTAT = "netstat -a -n | egrep '" + PORT + ".* LISTEN'"; //TODO: Make this a util method
var FILE = 'test/test_boardstate.conf';

var servers = network_utils.create_servers(PORT);
var board_controller = require('../lib/board_controller')(FILE, servers.socketio_server);

describe('board_controller.start()', function() {

  board_controller.start(function() {
    it('* Should listen on port ' + PORT, function(done) {
      exec(NETSTAT, function(error, stdout, stderr) {
        stdout.should.not.have.length(0);
        done();
      });
    });
  });

  it('* Client should open and.emit messages', function(done) {
    var message_count = 0;
    client = io('http://' + HOST + ':' + PORT);
    client.on('connect', function() {
      setTimeout(function() {
        done();
        client.close();
      }, 1200);
    });

    client.on('disconnect', function() {
      describe('board_controller.stop()', function() {
        it('* Socket should close', function(done) {

          var result = board_controller.stop();
          console.log(result);
          servers.express_server.close();
          exec(NETSTAT, function(error, stdout, stderr) {
            stdout.should.have.length(0);
            done();
          });
        });
      });
    });
  });
});
