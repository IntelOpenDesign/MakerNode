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
        if (settings.be_access_point()) {
            log.info('Starting Access Point');
            sh('./startAP.sh'); //TODO: I'd like this to be asynchronous...

        } else { // connect to router
            log.info('Connecting to Router');
            // REFACTOR_IDEA wait so we don't need to do anything here? it defaults to connecting to the router?
            // TODO
            // do this when you are entering wifi router info (form submit):
            //sh('./wpa_supplicant.conf ' + ssid + wifi_password );
            //
            // TODO do we need to call /etc/init.d/networking restart every time we want to connect to wifi or is it only after the first time we connect to a new network after restarting?

        }
    });

    gpio.init(onInput).then(
        onBoardReady,
        function(reason) {
            log.error('could not init gpio: ' + reason);
        }
    );

    function onBoardReady(board) {
        // REFACTOR_IDEA so the conf little wrapper library will read the file and give us JSON, but when we write to a file we have to do the JSON.stringify ourselves... seems inconsistent...
        // REFACTOR_IDEA overall I feel like more code = more places for bugs to hide. This makes me dislike wrapper modules. But I get that for conf.js the consistent logging of success / failure around reading files is nice.
        // REFACTOR_IDEA having a consistent way of writing our own node modules would be nice, at least the interface for them.
        boardConf.read(BOARD_CONF_FILE)
            .then(
                function(pinState) {
                    log.debug('Pin state loaded.', pinState);
                    // REFACTOR_IDEA why do we restart networking here? isn't this deprecated anyway?
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
