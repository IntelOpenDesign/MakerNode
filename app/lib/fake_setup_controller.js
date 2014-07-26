function setup_controller(state, ws, ws_port) {

    console.log('setup_controller.js init');

    //var log = require('./log').create('SetupCtrl');

    console.log('setup_controller.js about to try to require socket.io');
    console.log('setup_controller.js just finished require socket.io');

    var start = function() {
        console.log('inside setupCtrl.start');
        ws.on('connection', function(socket) {
            console.log('setup_controller.js client connected');

            socket.on('confirm_mac', function() {});

            socket.on('create_user', function() {});

            socket.on('router_setup', function() {
                ws.emit('redirect', {
                    url: '127.0.0.1',
                    port: ws_port
                });
            });

            socket.on('disconnect', function() {
                console.log('setup_controller.js client disconnected');
            });
        });
    };

    var stop = function() {

    };

    var set_on_finished = function(cb) {

    };

    console.log('setup_controller.js finish init');

    return {
        start: start,
        stop: stop,
        set_on_finished: set_on_finished,
    };
};

module.exports = setup_controller;
