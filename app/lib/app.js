"use strict";

// REFACTOR_IDEA more code = more places for bugs to hide

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

// REFACTOR_IDEA can we put the boardConf together with the gpio stuff into a Board module? I feel like app.js does the read/writing for boardstate.conf but then gpio does a lot of the actual using/manipulating the boardState...

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
        // REFACTOR_IDEA having a consistent way of writing our own node modules would be nice, at least the interface for them.
        boardConf.read(BOARD_CONF_FILE)
            .then(
                // REFACTOR_IDEA really minor but: want to rename pinState to something more like boardState. or at least pinsState (plural)
                function(pinState) {
                    log.debug('Pin state loaded.', pinState);
                    // REFACTOR_IDEA why do we restart networking here? isn't this deprecated anyway?
                    sh('/etc/init.d/networking restart');
                    socket.create(function() {
                        var model = socket.getMessage();
                        gpio.refreshOutputs(model);
                        // REFACTOR_IDEA some parts of the socket message do not need to be recorded in boardstate.conf, for example the count or message_ids_processed. In fact I think it's better that they don't get recorded in boardstate.conf
                        // REFACTOR_IDEA need a better interface between socket.js and boardstate.conf
                        // REFACTOR_IDEA when writing out JSON, let's try using JSON.stringify(object, null, 4) so it will be human readable also
                        boardConf.write(BOARD_CONF_FILE, JSON.stringify(model)); //TODO: throttle writes
                    });
                    if (typeof pinState === 'undefined') {
                        //TODO: initiate setup flow?
                        // REFACTOR_IDEA at least show an error log here
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

    // REFACTOR_IDEA passing in the "then" part of a promise makes sense, but other than that all these callbacks make this code feel like spaghetti. can we just move the callbacks into the module that is using them?
}

function stop() {
    http.close();
}
