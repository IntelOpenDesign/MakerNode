"use strict";

function App() {}
var log = require('./log').create('App');
var conf = require('./conf');
var appConf = conf.create();
var boardConf = conf.create();
var gpio = require('./gpio')();
var http = require('./http')();
var socket = require('./socket').create();
var sh = require('./command_queue').init().enqueue;

var BOARD_CONF_FILE = 'boardstate.conf';
var APP_CONF_FILE = 'appstate.conf';
var HTTP_PORT = 80;

App.prototype.start = start;
module.exports = function() {
    return new App();
}

function start() {
    log.info('Starting CAT...');
    appConf.read(APP_CONF_FILE).then(
        function(appState) {
            log.debug('App. state loaded.', appState);
            if (typeof appState === 'undefined') {
              log.error('fail');
                throw "App state is not defined.";
            } else if (appState.app_mode == 'setup') {
                log.info('Starting AP.');
                sh('./startAP.sh'); //TODO: I'd like this to be asynchronous...   
                gpio.init(onInput)
                    .then(
                        onBoardReady,
                        function(reason) {
                            log.error('could not init gpio: ' + reason);
                        }
                );
            } else if (appState.app_mode == 'controller') {

            } else {
                throw "Invalid app. mode.";
            }
        }
    );

    function onBoardReady(board) {
        boardConf.read(BOARD_CONF_FILE)
            .then(
                function(pinState) {
                    log.debug('Pin state loaded.', pinState);
                    socket.create(function() {
                        var model = socket.getMessage();
                        gpio.refreshOutputs(model);
                        boardConf.write(CONF_FILE, JSON.stringify(model)); //TODO: throttle writes
                    });
                    if (typeof pinState === 'undefined') {
                        //TODO: initiate setup flow?  
                    } else {
                        socket.setMessage(pinState);
                    }
                    http.listen(HTTP_PORT);
                    log.info('CAT is ready.');

                },
                function(reason) {
                    log.error('read error: ' + reason);
                }
        );
    }

    function onInput(pinIndex, value) {
        var boardState = socket.getMessage();
        boardState.pins[pinIndex].value = value / 1024;
        gpio.refreshOutputs(boardState);
    }
}

function stop() {
    http.close();
}
