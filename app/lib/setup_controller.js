"use strict";
var io = require('socket.io');
var sh = require('./command_queue').init().enqueue;
var _ = require('underscore');
var log = require('./log')('setup_controller');

module.exports = function(state, wss, on_finished, on_redirect) {
  var onUpdate;

  function start(port) {
    log.info('Start');

    wss.on('connect', function(conn) {
      log.debug('client connected');

      // client is asking what mode we are in
      conn.on('mode', function() {
          // TODO make this not hard coded
          conn.emit('mode', 'setup');
      });

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

      // TODO I think it would be better to assign to this event in lib/app.js,
      // but I am not sure if I can do that without blocking the other events
      // that setup_controller.js needs to listen to
      conn.on('redirect', function(d) {
        log.debug('client says it is ready to redirect');
        on_redirect();
      });

      conn.on('disconnect', function(d) {
          log.debug('client disconnected');
      });
    });

  }

  function stop() {
    log.info('STOPPED', state);
  };

  return {
    start: start,
    stop: stop,
  };
}
