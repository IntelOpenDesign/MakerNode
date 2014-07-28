"use strict";
var io = require('socket.io');
var sh = require('./command_queue').init().enqueue;
var _ = require('underscore');
var log = require('./log').create('setup_controller');

module.exports = function(state, wss) {
  var onUpdate;
  var on_finished;

  function start(port) {
    log.info('WebSockets Serving listening on port ' + port);

    wss.on('connect', function(conn) {

      conn.on('confirm_mac', function(d) { // STEP 1
        state.network_confirmed = true;
      });

      conn.on('create_user', function(d) { // STEP 2
        state.user_password_set = true;
      });

      conn.on('router_setup' function(d) { // STEP 3
        if (_.has(d, 'wifi_ssid') && _.has(d, 'wifi_password')) {
          state.router_ssid = d.wifi_ssid;
          state.router_password = d.wifi_password;
          on_finished(state);
        }
      });
    });
  }

  function stop() {
    log.info('STOPPED', state);
  };

  function set_on_finished(callback) {
    on_finished = callback;
  };

  return {
    start: start,
    stop: stop,
    set_on_finished: set_on_finished
  };
}
