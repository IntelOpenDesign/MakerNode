"use strict";
var sh = require('./command_queue').init().enqueue;
var log = require('./log').create('network_utils');

module.exports = function() {
  function start_access_point() {
    sh('./startAP.sh'); //TODO: I'd like this to be asynchronous...
  }

  function stop_access_point() {
    sh('killall hostapd');
  }

  function start_supplicant(ssid, password, gateway_ip, static_ip) {
    var our_command = './init_supplicant.sh ' + ssid + ' ' + password;
    if (gateway_ip && static_ip) {
      our_command += ' ' + static_ip + ' ' + gateway_ip;
    }
    log.info('Attempting to init wlan0 with command: ' + our_command);
    exec(our_command, function(error, stdout, stderr) {
      if (error !== null) {
        log.error('Error starting supplicant.', 'error=' + error, 'stdout=' + stdout, 'stderr=' + stderr);
      }
    });
  }

  function stop_supplicant() {
    //TODO
    //It seems like this is just
    sh('./restore_factory_settings.sh');
  }

  return {
    start_access_point: start_access_point,
    stop_access_point: stop_access_point,
    start_supplicant: start_supplicant,
    stop_supplicant: stop_supplicant
  };
}

//TODO: It would be nice to support callbacks on these.
