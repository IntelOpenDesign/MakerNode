"use strict";
require('q');
var log = require('./log').create('SetupController');
var sh = require('./command_queue').init().enqueue;


function setupController() {
    var init = function() {
     
    };

    var configureWlan0 = function(beAccessPoint) {
      //TODO examine state of wlan0 to decide if we need to do something or not
        if (beAccessPoint) {
            log.info('Starting Access Point');
            sh('./startAP.sh'); //TODO: I'd like this to be asynchronous...

        } else { // connect to router
            log.info('Connecting to Router');
            // TODO
            // do this when you are entering wifi router info (form submit):
            //sh('./wpa_supplicant.conf ' + ssid + wifi_password );
            //
        }

    }


    return {
        init: init,
        configureWlan0: configureWlan0,            
    };

}

module.exports = setupController;

