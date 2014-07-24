"use strict";

function app() {

    var log = require('./log')('App');
    var http = require('./http')();
    var conf = require('./conf')();
    var setupCtrlF = require('./setup_controller');
    var boardCtrlF = require('./board_controller');
    var netUtils = require('./network_utils')();

    var APP_CONF_FILE = 'appstate.conf';
    var BOARD_CONF_FILE = 'boardstate.conf';
    var HTTP_PORT = 80;
    var WS_PORT = 8001;

    var app_state;
    var setupCtrl;
    var boardCtrl;

    var start = function() {
        log.info('Starting MakerNode...');

        http.listen(HTTP_PORT);
        log.info('HTTP server is ready.');

        conf.init(APP_CONF_FILE).then(function() {
            app_state = conf.read();
            if (app_state.mode === 'setup') {
                launch_setup_ctrl();
            } else {
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
        }
        conf.write(app_state);
    };

    var launch_setup_ctrl = function() {
        netUtils.start_access_point();
        setupCtrl = setupCtrlF(app_state.setup_state);
        setupCtrl.on_setup_finished(function() {
            app_state.mode = 'control';
            conf.write();
            setupCtrl.stop();
            netUtils.stop_access_point();
            launch_board_ctrl();
        });
        setupCtrl.start(WS_PORT);
    };

    var launch_board_ctrl = function() {
        netUtils.start_supplicant();
        boardCtrl = boardCtrlF(BOARD_CONF_FILE);
        boardCtrl.start(WS_PORT);
    };

    return {
        start: start,
        stop: stop,
    };
};

module.exports = app;
