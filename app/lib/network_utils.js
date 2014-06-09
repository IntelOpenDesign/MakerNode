"use strict";
var sh = require('./command_queue')();
var log = require('./log')('network_utils');

module.exports = function() {
  function start_access_point(callback) {
    sh('./startAP.sh', callback);
  }

  function stop_access_point(callback) {
    sh('killall hostapd', callback);
  }

  function start_supplicant(options, callback) {
    var command = './init_supplicant.sh ' + options.ssid + ' ' + options.pwd;
    if (options.gateway_ip && options.static_ip) {
      command += ' ' + options.static_ip + ' ' + options.gateway_ip;
    }
    sh(command, callback);
  }

// TODO stop_supplicant does more than just stop the wifi connection.
// it also resets us to setup mode! this is not a well named function
  function stop_supplicant(callback) {
    sh('./restore_factory_settings.sh', callback);
  }

  function get_hostname(callback) {
    sh('hostname', callback);
  }

  return {
    start_access_point: start_access_point,
    stop_access_point: stop_access_point,
    start_supplicant: start_supplicant,
    stop_supplicant: stop_supplicant,
    get_hostname: get_hostname,
  };
}
