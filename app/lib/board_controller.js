function board_controller(conf_filename, ws) {

    //var log = require('./log').create('BoardCtrl');
    var conf = require('./conf').create();
    var _ = require('underscore');
    var GalileoF = require('galileo-io');

    var state;   // board state JSON object, recorded in conf file
    var galileo; // communication with the actual Galileo using GPIO

    var start = function() {
        conf.read(conf_filename).then(function(o) {
            state = o;

            galileo = new GalileoF();
            galileo.on('ready', function() {
                _.each(state.pins, function(pin, idstr) {
                    var id = parseInt(id);
                    var mode = pin.is_input ? 'INPUT': 'OUTPUT';
                    this.pinMode(id, this.modes[mode]);
                    if (pin.is_input) {
                        var method = pin.is_analog ? 'analog': 'digital':
                        galileo[method+'Read'](id, pin_listener(id));
                    }
                });
            });

            ws.on('connection', function(socket) {
                console.log('board_controller.js client connected');

                socket.on('pins', update_pins);

                socket.on('disconnect', function() {
                    console.log('board_controller.js client connected');
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
        console.log('board_controller.js update pin ' + id + ' with value ' + data.toString());
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
        conf.write();
    };

    return {
        start: start,
        stop: stop,
    };
};
