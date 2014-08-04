"use strict";

function app() {
    var APP_CONF_FILE = 'conf/appstate.conf';
    var BOARD_CONF_FILE = 'conf/boardstate.conf';
    var PORT = 80; // for the static file server and the websocket server
    var PING_PORT = 8000; // for the hacky http server that just responds with 'Hello...'

    var express = require('express');
    var path = require('path');
    var socketio = require('socket.io');
    var http = require('http');

    var sh = require('./command_queue')();
    var log = require('./log')('App');
    var conf = require('./conf').create();
    var setupCtrlF = require('./setup_controller');
    var boardCtrlF = require('./board_controller');
    var netUtils = require('./network_utils')();

    var express_app;
    var express_server;
    var socketio_server;
    var http_server;

    var app_state;
    var setupCtrl;
    var boardCtrl;

    var start = function() {
        log.info('Starting MakerNode...');

        // TODO move starting express and socketio server to network_utils
        // var o = netUtils.create_servers(PORT);
        // express_server = o.express_server;
        // socketio_server = o.socketio_server;
        express_app = express();
        express_app.use(express.static(path.join(__dirname, '../client')));
        express_server = express_app.listen(PORT);
        socketio_server = socketio.listen(express_server);

        log.info('HTTP and WS servers listening on port', PORT);

        socketio_server.on('connect', function(conn) {
            log.debug('client connected');

            // client is asking what mode we are in
            conn.on('mode', function() {
                log.debug('client is asking what mode we are in:', app_state.mode);
                conn.emit('mode', app_state.mode);
            });

            conn.on('reset', function() {
                log.info('client has requested a server reset');
                sh('./restore_factory_settings.sh');
                sh('reboot');
            });
        });

        conf.read(APP_CONF_FILE).then(function(o) {
            app_state = o;
            if (app_state.mode === 'setup') {
                launch_setup_ctrl();
            } else {

                // TODO only call this when needed
                // only host this http server for when the client side is
                // trying to ping the server side to see if it can redirect
                // so we only need to do this when we boot up immediately after
                // finishing setup, not every time we launch board controller
                http.createServer(function(req, res) {
                    res.writeHead(200, {
                        'Content-Type': 'text/plain',
                        'Access-Control-Allow-Origin': '*',
                    });
                    res.end('Hello from your friendly hacky Galileo webserver');
                }).listen(PING_PORT);

                launch_board_ctrl();
            }
        });
    };

    var stop = function() {
        if (app_state.mode === 'setup') {
            setupCtrl.stop();
            netUtils.stop_access_point();
        } else {
            boardCtrl.stop();
            netUtils.stop_supplicant();
            netUtils.restore_factory_settings();
        }
        conf.write(app_state);
        // TODO make sure we are actually closing the websocket server
        //socketio_server.close();
        express_server.close();
        // TODO stop http ping server
    };

    var launch_setup_ctrl = function() {
        netUtils.start_access_point();
        setupCtrl = setupCtrlF(app_state.setup_state, socketio_server,
                function on_finished(setup_state) {
                    log.debug('finished with setup');
                    app_state.mode = 'control';
                    app_state.setup_state = setup_state;
                    log.debug('app_state', JSON.stringify(app_state, null, 2));
                    conf.write(APP_CONF_FILE, app_state).then(function() {
                        netUtils.get_hostname(function(error, stdout, stderr) {
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
                            socketio_server.emit('redirect', {
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
                    netUtils.stop_access_point(function() {
                        log.debug('finished stopping access point');
                        setupCtrl.stop();
                        sh('reboot');
                    });            
                });
        // TODO error callback
        // TODO have setup_controller _.extend({}, setup_state) to clone
        // setup_state instead of modify it. then we copy it back onto the
        // app_state here
        setupCtrl.start();
    };

    var launch_board_ctrl = function() {
        netUtils.start_supplicant({
            ssid: app_state.setup_state.ssid,
            pwd: app_state.setup_state.pwd,
        }, function() { // callback
            boardCtrl = boardCtrlF(BOARD_CONF_FILE, socketio_server);
            boardCtrl.start();
        });
    };

    return {
        start: start,
            stop: stop,
    };
};

module.exports = app;
