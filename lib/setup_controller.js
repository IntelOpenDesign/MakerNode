"use strict";
var io = require('socket.io');
var _ = require('underscore');
var log = require('mnutils/log')('setup_controller');
var utils = require('mnutils/galileo')();

module.exports = function(state, wss, on_finished, on_redirect) {
  var onUpdate;

  function start() {
    log.info('Start');

    wss.on('connect', function(conn) {
      conn.on('set_hostname', function(d) { // STEP 1
        log.debug('got set_hostname info', JSON.stringify(d));
        utils.set_hostname(d.hostname, function() {
          state.set_hostname = true;
        });
      });

      conn.on('set_root_password', function(d) { // STEP 2
        log.debug('got set_root_password info', JSON.stringify(d));
        utils.set_root_password(d.root_password, function() {
          state.set_root_password = true;
        });
      });

      conn.on('router_setup', function(d) { // STEP 3
        if (_.has(d, 'ssid') && _.has(d, 'pwd')) {
        log.debug('got router info', JSON.stringify(d));
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
