"use strict";
var io = require('socket.io');
var sh = require('./command_queue').init().enqueue;
var _ = require('underscore');
var log = require('./log')('setup_controller');

module.exports = function(state, wss) {
  var onUpdate;
  var on_finished;

  function start(port) {
    log.info('Start');

    wss.on('connect', function(conn) {
      log.debug('client connected');

      conn.on('confirm_mac', function(d) { // STEP 1
        log.debug('got confirm_mac info', JSON.stringify(d));
        state.network_confirmed = true;
      });

      conn.on('create_user', function(d) { // STEP 2
        log.debug('got create_user info', JSON.stringify(d));
        state.user_password_set = true;
      });

      conn.on('router_setup', function(d) { // STEP 3
        log.debug('got router info', JSON.stringify(d));
        if (_.has(d, 'ssid') && _.has(d, 'pwd')) {
          state.ssid = d.ssid;
          state.pwd = d.pwd;
          on_finished(state);
        }
      });

      conn.on('disconnect', function(d) {
          log.debug('client disconnected');
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
