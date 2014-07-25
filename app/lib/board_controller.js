function board_controller = function(conf_filename) {

    var log = require('./log')('BoardCtrl');
    var conf = require('./conf')(conf_filename);
    var socketio = require('./socket.io');
    var _ = require('underscore');

    var ws;
    var board;

    var start = function(ws_port) {
        conf.read().then(function(o) {
            board = o;

            ws = socketio(ws_port);

            ws.on('connection', function(socket) {
                log.info('client connected');

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
                    log.info('client disconnected');
                });
            });
        });
    };

    var stop = function() {
        conf.write();
        socketio.close();
    };

    return {
        start: start,
        stop: stop,
    };
};
