function setup_controller(state) {

    var log = require('./log').create('SetupCtrl');
    var socketio = require('/socket.io');
    var ws;

    var start = function(ws_port) {
        ws = socketio(ws_port);
        ws.on('connection', function(socket) {
            log.info('client connected');

            socket.on('confirm_mac', function() {});

            socket.on('create_user', function() {});

            socket.on('router_setup', function() {
                socketio.emit('redirect', {
                    url: '127.0.0.1',
                    ws_port: '8001',
                });
            });

            socket.on('disconnect', function() {
                log.info('client disconnected');
            });
        });
    };

    var stop = function() {

    };

    var set_on_finished = function(cb) {

    };

    return {
        start: start,
        stop: stop,
        set_on_finished: set_on_finished,
    };
};

module.exports = setup_controller;
