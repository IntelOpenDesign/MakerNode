"use strict";

function App() {}
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
    console.log('Starting CAT...');
    appConf.read(APP_CONF_FILE).then(
        function(appModel) {
            console.log(appModel);
            if (true) {
                sh('./startAP.sh'); //TODO: I'd like this to be asynchronous...   
                gpio.init(onInput)
                    .then(
                        onBoardReady,
                        function(reason) {
                            console.log('could not init gpio: ' + reason);
                        }
                );
            }
        }
    );

    function onBoardReady(board) {
        boardConf.read(BOARD_CONF_FILE)
            .then(
                function(pinModel) {
                    console.log(pinModel);
                    socket.create(function() {
                        var model = socket.getMessage();
                        gpio.refreshOutputs(model);
                        boardConf.write(CONF_FILE, JSON.stringify(model)); //TODO: throttle writes
                    });
                    if (typeof pinModel === 'undefined') {
                        //TODO: initiate setup flow?  
                    } else {
                        socket.setMessage(pinModel);
                    }
                    http.listen(HTTP_PORT);
                    console.log('CAT is ready.');

                },
                function(reason) {
                    console.log('read error: ' + reason);
                }
        );
    }

    function onInput(pinIndex, value) {
        var model = socket.getMessage();
        model.pins[pinIndex].value = value / 1024;
        gpio.refreshOutputs(model);
    }
}

function stop() {
    http.close();
}
