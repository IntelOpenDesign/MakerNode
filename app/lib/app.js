"use strict";

function app() {

    var APP_CONF_FILE = 'appstate.conf';
    var BOARD_CONF_FILE = 'boardstate.conf';
    var HTTP_PORT = 8000;
    var WS_PORT = 8001;

    var http = require('./http')();
    //var log = require('./log').create('App');
    var conf = require('./conf').create();
    var setupCtrlF = require('./fake_setup_controller');
    var boardCtrlF = require('./board_controller');
    //var netUtils = require('./network_utils')();

    var app_state;
    var setupCtrl;
    var boardCtrl;

    var start = function() {
        console.log('app.js Starting MakerNode...');

        http.listen(HTTP_PORT);

        conf.read(APP_CONF_FILE).then(function(o) {
            app_state = o;
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
            //netUtils.stop_access_point();
        } else {
            boardCtrl.stop();
            //netUtils.stop_supplicant();
        }
        conf.write(app_state);
    };

    var launch_setup_ctrl = function() {
        console.log('app.js launch setup control');
        //netUtils.start_access_point();
        setupCtrl = setupCtrlF(app_state.setup_state);
        console.log('app.js instantiated setup control');
        setupCtrl.set_on_finished(function(setup_state) {
            app_state.mode = 'control';
            app_state.setup_state = setup_state;
            conf.write();
            setupCtrl.stop();
            //netUtils.stop_access_point();
            launch_board_ctrl();
        });
        setupCtrl.start(WS_PORT);
    };

    var launch_board_ctrl = function() {
        //netUtils.start_supplicant();
        boardCtrl = boardCtrlF(BOARD_CONF_FILE);
        boardCtrl.start(WS_PORT);
    };

    return {
        start: start,
        stop: stop,
    };
};

module.exports = app;
