"use strict";
function App() {}

var conf = require('./conf').create();
var gpio = require('./gpio')();
var http = require('./http')();
var socket = require('./socket').create();
var sh = require('./command_queue').init().enqueue;

var CONF_FILE = 'boardstate.conf';
var HTTP_PORT = 80;

App.prototype.start = start;
App.prototype.onInput = onInput;
module.exports = function() {
    return new App();
}

function start() {
    console.log('Starting CAT...');
    sh('./startAP.sh'); //TODO: I'd like this to be asynchronous...   
    gpio.init(onInput)
        .then(
            function(board) {
                conf.read(CONF_FILE)
                    .then(
                        function(pinModel) {
                            console.log(pinModel);
                            socket.create(function() {
                                var model = socket.getMessage();
                                gpio.refreshOutputs(model);
                                conf.write(CONF_FILE, JSON.stringify(model)); //TODO: throttle writes
                            });
                            if (typeof pinModel  === 'undefined') {
                            //TODO: initiate setup flow?  
                            }
                            else {
                              socket.setMessage(pinModel);
                            }
                            http.listen(HTTP_PORT);
                            console.log('CAT is ready.');

                        },
                        function(reason) {
                            console.log('read error: ' + reason);
                        }
                );
            },
            function(reason) {
                console.log('could not init gpio: ' + reason);
            }
    );
}

function onInput(pinIndex, value) {
    var model = socket.getMessage();
    model.pins[pinIndex].value = value / 1024;
    gpio.refreshOutputs(model);
}

function stop() {
    http.close();
}
