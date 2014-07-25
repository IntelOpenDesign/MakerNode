"use strict";
var sh = require('./command_queue').init().enqueue;
var log = require('./log').create('network_utils');

module.exports = function() {

  function start_access_point() {

  }
  
  function stop_access_point() {

  }

  function start_spplicant(ssid, password, gateway_ip, static_ip) {

  }

  function stop_supplicant() {

  }

  return {
    start_access_point: start_access_point,
    stop_access_point: stop_access_point,
    start_supplicant: start_supplicant,
    stop_supplicant: stop_supplicant
  };
}
