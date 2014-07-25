"use strict";
require('q');
var log = require('./log').create('setup_controller');
var sh = require('./command_queue').init().enqueue;

var _ = require('underscore');
// REFACTOR_IDEA what was the status on using ws again instead of something better? what else were we considering? will it be available on the next build of Galileo?
var WebSocketServer = require('ws').Server;
var exec = require('child_process').exec;
var sh = require('./command_queue').init().enqueue;
var wss;
var onUpdate;
var msg;
var N_CLIENTS = 0;
var on_finished;
var messages_dict = {};

function setup_controller(state) {
  var start = function(port) {
    log.info('WebSockets Serving listening on port ' + port);
    wss = new WebSocketServer({
      port: port
    });
    wss.on('connection', function(conn) {
      var broadcast_interval_id = 0;
      N_CLIENTS ++;
      log.info('new connection, N_CLIENTS', N_CLIENTS);
      if (!broadcast_interval_id) {
        broadcast_interval_id = setInterval(function() {
          msg.count += 1;
          msg.message_ids_processed = _.keys(messages_dict);
          msg.hash_code = get_hash_code();
          msg.url_root = '';
          try {
            conn.send(JSON.stringify(msg));
          } catch (error) {
            log.info(error);
            //TODO: do we need to recover here?
          }
          //log.info('sent message: ' + JSON.stringify(msg));
          _.each(_.keys(messages_dict), function(id) {
            messages_dict[id] += 1;
          });
          var message_ids_to_delete = _.filter(_.keys(messages_dict),
            function(id) {
              return messages_dict[id] >= N_CLIENTS * 2;
            });
          _.each(message_ids_to_delete, function(id) {
            delete messages_dict[id];
          });
        }, 33); //TODO: Figure out the optimal value here
      }

      conn.on('message', function(str) {
        log.info('received ' + str);
        setTimeout(function() {
          var d = JSON.parse(str);
          log.info('processing message ID', d.message_id);

          messages_dict[d.message_id] = 0;
          if (_.has(d, 'mac_address')) { //STEP 1
            state.network_confirmed = true;
          }
          if (_.has(d, 'username') && _.has(d, 'user_password')) { //STEP 2
            state.user_password_set = true;
          }
          if (_.has(d, 'wifi_ssid') && _.has(d, 'wifi_password')) { //STEP 3
            state.router_ssid = d.wifi_ssid;
            state.router_password = d.wifi_password;
            on_finished(state); 
          }
          if (_.has(d, 'reset') && d.reset === true) {
            sh('./restore_factory_settings.sh');
          }
        }, 0);

        conn.on('close', function(code, reason) {
          clearInterval(broadcast_interval_id);
          broadcast_interval_id = 0;
        });
        conn.on('end', function() {
          log.info('end');
        });
        conn.on('error', function() {
          log.info('error');
        });
      });
    });

  }
  //stops server and terminates clients
  var stop = function() {
    log.info('STOPPED', state);

    wss.close();
  };

  var set_on_finished = function(callback) {
    on_finished = callback;
  };

  return {
    start: start,
    stop: stop,
    set_on_finished: set_on_finished
  };
}

module.exports = setup_controller;
//I Guess this is moving back to app.js ...
/*
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
*/

/* TODO writes should occur in app.js
  var set_user_password = function() {
    state.user_password_set = true;
    return write();
  };

  var set_router_info = function(ssid, pw) {
    state.router_ssid = ssid;
    state.router_password = pw;
    state.app_mode = "control";
    return write();
  };
  */
