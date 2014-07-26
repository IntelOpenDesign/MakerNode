function board_controller(conf_filename, ws) {

    //var log = require('./log').create('BoardCtrl');
    var conf = require('./conf').create();
    var _ = require('underscore');

    var board;

    var start = function() {
        conf.read(conf_filename).then(function(o) {
            board = o;

            ws.on('connection', function(socket) {
                console.log('board_controller.js client connected');

                socket.on('pins', function(d) {
                    _.each(d.pins, function(pin, id) {
                        _.extend(board.pins[id], pin);
                    });
                    socketio.emit('pins', {
                        pins: board.pins,
                        msg_id_processed: d.msg_id,
                    });
                });

                socket.on('disconnect', function() {
                    console.log('board_controller.js client connected');
                });
            });
        });
    };

    var stop = function() {
        conf.write();
    };

    return {
        start: start,
        stop: stop,
    };
};
