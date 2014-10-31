/** 
 * @module setup_controller
 **/

"use strict";
var io = require('socket.io');
var _ = require('underscore');
var log = require('./utils/log')('setup_controller');
var utils = require('./utils/galileo')();

module.exports = function(state, wss, on_finished, on_redirect) {
  var onUpdate;

  /**
   * Call to start setup flow.
   * @method start
   * @return void 
   */
  function start() {
    log.info('Start');

    wss.on('connect', function(conn) {
      conn.on('set_hostname', function(d) { // STEP 1
        log.debug('got set_hostname info', JSON.stringify(d));
        utils.set_hostname(d.hostname, function() {
          state.set_hostname = true;
        });
      });

      conn.on('router_setup', function(d) { // STEP 2
        log.debug('got router info', JSON.stringify(d));
         if (_.has(d, 'ssid')) {
	    	 state.ssid = d.ssid;
	 }
	 if (_.has(d, 'pwd')){
          state.pwd = d.pwd;
	 }
          on_finished(state);
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

  /**
   * Call when setup flow is completed. 
   * @method stop
   * @return void 
   */
  function stop() {
    log.info('STOPPED', state);
  };

  return {
    start: start,
    stop: stop,
  };
}
