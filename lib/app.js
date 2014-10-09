/**
 * @module app
 **/
"use strict";

function app() {
  var APP_CONF_FILE = 'conf/appstate.conf';
  var BOARD_CONF_FILE = 'conf/boardstate.conf';
  var PORT = 8010; // for the static file server and the websocket server
  var PING_PORT = 8000; // for the hacky http server that just responds with 'Hello...'

  var path = require('path');
  var http = require('http');
  var sh = require('./utils/command_queue')();
  var log = require('./utils/log')('app')
  var conf = require('./conf')();
  var setupCtrlF = require('./setup_controller');
  var boardCtrlF = require('./board_controller');
  var utils = require('./utils/galileo')();

  var servers;
  var app_state;
  var setupCtrl;
  var boardCtrl;

  /**
   * Start the application
   * @method start
   * @param {} cb
   * @return void
   */
  var start = function(cb) {
    log.info('Starting MakerNode...');
    conf.read(APP_CONF_FILE).then(function(o) {
      app_state = o;

      utils.stop_service('lighttpd', function() {
        servers = utils.create_servers(PORT, path.join(__dirname, '../client'));
        log.info('HTTP and WS servers listening on port', PORT);

        if (app_state.mode === 'setup') {
          utils.list_wifi_networks(function() { //we need to run this to cache the list before connman goes down
            utils.start_access_point(launch_setup_ctrl);
          });
        } else {
          launch_board_ctrl(function() { // callback for when board controller is ready
            // TODO only call this when needed
            // only host this http server for when the client side is
            // trying to ping the server side to see if it can redirect
            // so we only need to do this when we boot up immediately after
            // finishing setup, not every time we launch board controller
            log.debug('Setting up ping HTTP server');
            http.createServer(function(req, res) {
              res.writeHead(200, {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*',
              });
              res.end('Hello from your friendly hacky Galileo webserver');
            }).listen(PING_PORT);
            log.info('Ping HTTP server is listening on port', PING_PORT);
          });
        }

        servers.socketio_server.on('connect', function(conn) {
          log.debug('client connected');

          conn.on('mode', function() {
            log.debug('client is asking what mode we are in:', app_state.mode);
            conn.emit('mode', app_state.mode);
          });
          conn.on('networks', function() {
            utils.list_wifi_networks(function(available_wifi_networks) {
              if (!available_wifi_networks || !available_wifi_networks.length) {
                log.error("No networks were found!");
              }
              conn.emit('networks', available_wifi_networks);
            });
          });
          conn.on('reset', function() {
            log.info('client has requested a server reset');
            sh('./restore_factory_settings.sh');
            sh('reboot');
          });

          conn.on('set_root_password', function(d) {
            log.debug('got set_root_password info', JSON.stringify(d));
            utils.set_root_password(d.root_password, function() {
              app_state.set_root_password = true;
            });
          });
        });
      });
    });
  };

  /**
   * Stop the application
   * @method stop
   * @return void
   */
  var stop = function() {
    conf.write(app_state);
    express_server.close();
    // TODO close websocket
    if (app_state.mode === 'setup') {
      // TODO do we need to kill the access point here
      setupCtrl.stop();
    } else {
      // TODO close ping http server if it is running
      boardCtrl.stop();
    }
    conf.write(app_state);
    // TODO make sure we are actually closing the websocket server
    //socketio_server.close();
    servers.express_server.close();
    // TODO stop http ping server
  };

  var launch_setup_ctrl = function() {
    log.info('launch_setup_ctrl');
    setupCtrl = setupCtrlF(app_state.setup_state, servers.socketio_server,
      function on_finished(setup_state) {
        log.debug('finished with setup');
        app_state.mode = 'control';
        app_state.setup_state = setup_state;
        log.debug('app_state', JSON.stringify(app_state, null, 2));
        conf.write(APP_CONF_FILE, app_state).then(function() {
          log.debug('getting hostname for redirect...');
          utils.get_hostname(function(error, stdout, stderr) {
            // take newline off the end of stdout
            var hostname = stdout.slice(0, -1);
            // make sure hostname ends in .local
            var suffix = ".local";
            var suffix_len = suffix.length;
            if (hostname.slice(-suffix_len) !== suffix) {
              hostname = hostname + suffix;
            }
            log.debug('about to ask the client to redirect with hostname', hostname);
            // ask the client to redirect
            servers.socketio_server.emit('redirect', {
              url: hostname,
              ping_port: PING_PORT,
              port: PORT,
            });
          });
        });
      },
      // when the client says it is ready to redirect 
      function on_redirect() {
        log.debug('on_redirect, about to stop access point');
        utils.stop_access_point(function() {
          log.debug('finished stopping access point');
          setupCtrl.stop();
          //sh('reboot');
          sh('systemctl restart avahi-daemon', function() {
            require('child_process').spawn('systemctl', ['restart', 'maker-node']);
          });
        });
      });
    // TODO error callback
    // TODO have setup_controller _.extend({}, setup_state) to clone
    // setup_state instead of modify it. then we copy it back onto the
    // app_state here
    setupCtrl.start();
  };

  var launch_board_ctrl = function(cb) {
    utils.start_supplicant({
      ssid: app_state.setup_state.ssid,
      pwd: app_state.setup_state.pwd,
    }, function() { // callback
      sh('ifdown wlan0');
      sh('ifup wlan0');
      boardCtrl = boardCtrlF(BOARD_CONF_FILE, servers.socketio_server);
      boardCtrl.start(cb);
      log.info('Done with start_supplicant');
    });
  };

  return {
    start: start,
    stop: stop,
  };
};

module.exports = app;
