"use strict";
var sh = require('./command_queue').init().enqueue;
var log = require('./log')('network_utils');
var exec = require('child_process').exec;

module.exports = function() {
  function start_access_point() {
    sh('./startAP.sh'); //TODO: I'd like this to be asynchronous...
  }

  function stop_access_point(cb) {
    sh('killall hostapd');
    cb();
  }

  function start_supplicant(options) {
    var our_command = './init_supplicant.sh ' + options.ssid + ' ' + options.pwd;
    if (options.gateway_ip && options.static_ip) {
      our_command += ' ' + options.static_ip + ' ' + options.gateway_ip;
    }
    log.info('Attempting to init wlan0 with command: ' + our_command);
    exec(our_command, function(error, stdout, stderr) {
      if (error !== null) {
        log.error('Error starting supplicant.', 'error=' + error, 'stdout=' + stdout, 'stderr=' + stderr);
      }
      if (options.cb) {
        options.cb();
      }
    });
  }

  function stop_supplicant() {
    //TODO
    //It seems like this is just
    sh('./restore_factory_settings.sh');
  }

  function get_hostname(cb) {
    exec('hostname', function(error, stdout, stderr) {
       log.info('stdout', stdout);
       if (error !== null) {
            log.error('Error in get_hostname', error);
       }
       cb(stdout.slice(0, -1));
    });
  }

  return {
    start_access_point: start_access_point,
    stop_access_point: stop_access_point,
    start_supplicant: start_supplicant,
    stop_supplicant: stop_supplicant,
    get_hostname: get_hostname,
  };
}

//TODO: It would be nice to support callbacks on these.
