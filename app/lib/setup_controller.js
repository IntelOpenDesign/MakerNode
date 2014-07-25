"use strict";
var WebSocketServer = require('ws').Server,
  sh = require('./command_queue').init().enqueue,
  _ = require('underscore'),
  log = require('./log').create('setup_controller');

module.exports = function(state) {
  var wss;
  var onUpdate;
  var num_clients = 0;
  var on_finished;
  var messages_dict = {};

  function start(port) {
    log.info('WebSockets Serving listening on port ' + port);
    wss = new WebSocketServer({
      port: port
    });

    var msg = {
        status: 'OK', // TODO test client side with "error" status
        count: 0, // TODO remove when done debugging
        message_ids_processed: [],
        ssid: null,
        ws_port: port, // TODO get this from server app.js
    };

    wss.on('connection', function(conn) {
      var broadcast_interval_id = 0;
      num_clients++;
      if (broadcast_interval_id === 0) {

        broadcast_interval_id = setInterval(function() {
          msg.count++;
          msg.message_ids_processed = _.keys(messages_dict);
          msg.hash_code = get_hash_code();
          msg.url_root = '';
          conn.send(JSON.stringify(msg));
          log.info("SENT MESSAGE", msg);
          _.each(_.keys(messages_dict), function(id) {
            messages_dict[id] += 1;
          });
          var message_ids_to_delete = _.filter(_.keys(messages_dict),
            function(id) {
              return messages_dict[id] >= num_clients * 2;
            });
          _.each(message_ids_to_delete, function(id) {
            delete messages_dict[id];
          });
        }, 15); //TODO: Figure out the optimal value here
      }

      var get_hash_code = function() {
        if (!state.network_confirmed)
          return 'confirm_network';
        if (!state.user_password_set)
          return 'set_user_password';
        if (!state.router_ssid || state.router_ssid.length === 0 || !state.router_password || state.router_password.length === 0)
          return 'set_router_info';
        return '';
      };

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

  function stop() {
    log.info('STOPPED', state);
    wss.close();
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
