//var WebSocket = require('ws');
var io = require('socket.io-client');
var exec = require('child_process').exec;
var should = require('chai').should();

var setup_state = {};
var setup_controller = require('../lib/setup_controller')(setup_state);
var client;
var HOST = 'localhost';
var PORT = 8001;
var NETSTAT = "netstat -a -n | egrep '" + PORT + ".* LISTEN'"; //TODO: Make this a util method

/*socketOptions = {
  transports: ['websocket'],
  'force new connection': true
  }*/
describe('setup_controller.start()', function() {
  setup_controller.set_on_finished(function(state) {
    describe('setup_controller.on_finished()', function() {
      it('* Messages should update state correctly', function(done) {
        state.network_confirmed.should.equal(true);
        done();
      client.close();
      });
    });
  });

  setup_controller.start(PORT);
  it('* Should listen on port ' + PORT, function(done) {
    exec(NETSTAT, function(error, stdout, stderr) {
      stdout.should.not.have.length(0);

      done();
    });
  });

  it('* Client should open and.emit messages', function(done) {
    var message_count = 0;
    client = io('http://' + HOST + ':' + PORT);
    client.on('connect', function() {
      client.emit('event', '{"mac_address":"12345"}');
      message_count++;
    });


    client.on('event', function(data, flags) {
      if (message_count == 1) {
        client.emit('event', '{"user_password":"boo", "username":"who"}');
      }
      if (message_count == 2) {
        client.emit('event', '{"wifi_ssid":"cat", "wifi_password":"meow"}');
        done();
      }
      message_count++;
      console.log('DATA: ' + data);
    });

    client.on('disconnect', function() {
      describe('setup_controller.stop()', function() {
        it('* Socket should close', function(done) {

          setup_controller.stop();
          exec(NETSTAT, function(error, stdout, stderr) {
            stdout.should.have.length(0);
            done();
          });
        });
      });
    });
  });
});
