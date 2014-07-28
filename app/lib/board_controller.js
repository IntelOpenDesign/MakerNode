var log = require('./log')('BoardCtrl');
var conf = require('./conf').create();
var _ = require('underscore');
var GalileoF = require('galileo-io');

function board_controller(conf_filename, ws) {

    var state;   // board state JSON object, recorded in conf file
    var galileo; // communication with the actual Galileo using GPIO

    var start = function() {
        log.debug('Start');
        conf.read(conf_filename).then(function(o) {
            state = o;

            galileo = new GalileoF();
            galileo.on('ready', function() {
                _.each(state.pins, function(pin, idstr) {
                    var id = parseInt(id);
                    var mode = pin.is_input ? 'INPUT': 'OUTPUT';
                    this.pinMode(id, this.modes[mode]);
                    if (pin.is_input) {
                        var method = pin.is_analog ? 'analog': 'digital';
                        galileo[method+'Read'](id, pin_listener(id));
                    }
                });
            });

            ws.on('connection', function(conn) {
                log.debug('client connected');
                conn.emit('pins', {pins: state.pins});
                conn.on('pins', update_pins);
                conn.on('disconnect', function() {
                    log.debug('client disconnected');
                });
            });
        });
    };

    var pin_listener = function(id) {
        return _.throttle(function(id, data) {
            update_pin(id, data, null);
        }, 100);
    };

    var update_pin = function(id, data, msg_id) {
        log.info('Update pin with id', id, 'data', data, 'msg_id', msg_id);
        var pin = state.pins[id.toString()];
        if (pin.value === data) {
            return;
        }
        pin.value = data;
        if (!pin.is_input) {
            var method = pin.is_analog ? 'analog' : 'digital';
            galileo[method+'Write'](id, data);
        }
        socketio.emit('pins', {
            pins: state.pins,
            msg_id_processed: msg_id,
        });
    };

    var update_pins = function(d) {
        _.each(d.pins, function(pin, idstr) {
            update_pin(parseInt(id), pin.value, d.msg_id);
        });
    };

    var stop = function() {
        // TODO do we need to stop Galileo IO?
        conf.write(conf_filename, state);
    };

    return {
        start: start,
        stop: stop,
    };
};

module.exports = board_controller;
