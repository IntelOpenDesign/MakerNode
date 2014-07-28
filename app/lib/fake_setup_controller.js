function setup_controller(state, ws, ws_port) {

    var log = require('./log')('SetupCtrl');

    var start = function() {
        ws.on('connection', function(socket) {
            socket.on('confirm_mac', function() {});

            socket.on('create_user', function() {});

            socket.on('router_setup', function() {
                ws.emit('redirect', {
                    url: '127.0.0.1',
                    port: ws_port
                });
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
