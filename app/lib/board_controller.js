function board_controller = function(conf_filename) {

    var log = require('./log')('BoardCtrl');
    var conf = require('./conf')(conf_filename);
    var socketio = require('./socket.io');
    var _ = require('underscore');

    var ws;
    var board;
    var processed_messages = {};
    var broadcast_interval_id;
    var broadcast_interval = 33;

    var reply = function(o) {
        var default_reply = {status: 'OK', pins: board.pins};
        return _.extend(default_reply, o);
    };

    var start = function(ws_port) {
        conf.read().then(function(o) {
            board = o;

            ws = socketio(ws_port);

            broadcast_interval_id = setInterval(function() {
                ws.emit('pin update', reply({
                    msg_ids_processed: _.keys(processed_messages),
                }));
                processed_messages = {};
            }, broadcast_interval);

            ws.on('connection', function(socket) {
                log.info('client connected');

                socket.on('pin update', function(d) {
                    _.extend(board.pins, d.pins);
                    processed_messages[d.msg_id] = true;
                });

                socket.on('disconnect', function() {
                    log.info('client disconnected');
                });
            });
        });
    };

    var stop = function() {
        conf.write();
        clearInterval(broadcast_interval_id);
        // TODO could the interval callback happen after the socket is closed?
        socketio.close();
    };

    return {
        start: start,
        stop: stop,
    };
};
