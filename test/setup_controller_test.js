var io = require('socket.io-client');
var exec = require('child_process').exec;
var should = require('chai').should();

var utils = require('./utils/galileo')();

var state = {
  "setup_state": {
    "network_confirmed": false,
    "user_password_set": false,
    "ssid": "",
    "pwd": "",
    "router_gateway_ip": "",
    "galileo_static_ip": ""
  }
};

var client;
var HOST = 'localhost';
var PORT = 8001;
var NETSTAT = "netstat -a -n | egrep '" + PORT + ".* LISTEN'"; //TODO: Make this a util method

var servers = utils.create_servers(PORT);
var setup_controller = require('../lib/setup_controller')(state, servers.socketio_server, on_finished, on_redirect);

describe('setup_controller.start()', function() {

  setup_controller.start();
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
      utils.get_hostname(function(err, name){     
        client.emit('set_hostname', {hostname: name});
        setTimeout(function() {
          client.emit('router_setup', {ssid:'cat', pwd:'meow'});
        }, 500);
        setTimeout(done, 1000); //HACK
      });
    });
    
    client.on('disconnect', function() {
      describe('setup_controller.stop()', function() {
        it('* Socket should close', function(done) {

          setup_controller.stop();
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

function on_finished(state) {
  describe('setup_controller.on_finished()', function() {
    it('* Messages should update state correctly', function(done) {
		console.log(state.set_hostname + "=state.set_hostname");
      state.set_hostname.should.equal(true);
      client.close();
	  done();
    });
  });
}

function on_redirect() {}
