"use strict";

function App() {}
var log = require('../../../lib/utils/log')('App');
var conf = require('./conf');
var boardConf = conf.create();
var gpio = require('./gpio')();
var http = require('./http')();
var socket = require('./socket').create();
var sh = require('../../../lib/utils/command_queue')().enqueue;

var BOARD_CONF_FILE = 'boardstate.conf';
var APP_CONF_FILE = 'appstate.conf';
var HTTP_PORT;

App.prototype.start = start;
module.exports = function() {
    return new App();
}

function start(port) {
  HTTP_PORT = port;
    log.info('Starting MakerCAT...');

    gpio.init(onInput).then(
        onBoardReady,
        function(reason) {
            log.error('could not init gpio: ' + reason);
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
                        boardConf.write(BOARD_CONF_FILE, JSON.stringify(model)); //TODO: throttle writes
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
