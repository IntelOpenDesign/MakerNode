"use strict";

function App() {}
var log = require('./log').create('App');
var conf = require('./conf');
var settings = require('./settings')();
var boardConf = conf.create();
var gpio = require('./gpio')();
var http = require('./http')();
var socket = require('./socket').create(settings);
var sh = require('./command_queue').init().enqueue;

var setupController = require('./setupController)();

var BOARD_CONF_FILE = 'boardstate.conf';
var APP_CONF_FILE = 'appstate.conf';
var HTTP_PORT = 80;

App.prototype.start = start;
module.exports = function() {
    return new App();
}

function start() {
    log.info('Starting MakerNode...');

    settings.init(APP_CONF_FILE).then(function() {
      setupController.configureWlan0(settings.be_access_point);        
    });

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
                    sh('/etc/init.d/networking restart');
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
