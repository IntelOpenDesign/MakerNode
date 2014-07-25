var WebSocket = require('ws');
var exec = require('child_process').exec;
var should = require('chai').should();

var setup_state = {};
var setup_controller = require('../lib/setup_controller')(setup_state);
var client;
var HOST = '0.0.0.0';
var PORT = 8001;
var NETSTAT = "netstat -a -n | egrep '" + PORT + ".* LISTEN'"; //TODO: Make this a util method

describe('setup_controller.start()', function() {
  setup_controller.set_on_finished(function(state) {
    describe('setup_controller.on_finished()', function() {
      it('* Messages should update state correctly', function(done) {
        state.network_confirmed.should.equal(true);
        done();
      });
      client.close();
    });
  });

  setup_controller.start(PORT);
  it('* Should listen on port ' + PORT, function(done) {
    exec(NETSTAT, function(error, stdout, stderr) {
      stdout.should.not.have.length(0);

      done();
    });
  });

  it('* Client should open', function(done) {
    client = new WebSocket('ws://' + HOST + ':' + PORT);
    client.on('open', function() {
      client.send('{"mac_address":"12345"}');
      client.send('{"user_password":"boo", "username":"who"}');
      client.send('{"wifi_ssid":"cat", "wifi_password":"meow"}');
      done();
    });
    client.on('message', function(data) {
      //TODO
      console.log('DATA: ' + data);
    });

    client.on('close', function() {
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
