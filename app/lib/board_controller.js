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

                // send client all the pin info
                conn.emit('pins', {pins: state.pins});

                // client is sending us a pin update
                conn.on('pins', update_pins);

                // client is asking what mode we are in
                conn.on('mode', function() {
                    log.debug('client is asking what mode we are in');
                    //TODO make this not hard coded
                    conn.emit('mode', 'control');
                });

                conn.on('disconnect', function() {
                    log.debug('client disconnected');
                });
            });
        });
    };

    // only broadcast pins that have changed
    var broadcast_pin_updates = function(pin_idstrs, msg_id) {
        ws.emit('pins', {
            pins: _.pick(state.pins, pin_idstrs),
            msg_id: msg_id,
        });
    };

    // update input pins when Galileo-IO reports they have changed value
    var pin_listener = function(id) {
        return _.throttle(function(id, val) {
            var idstr = id.toString();
            if (state.pins[idstr].value === val) {
                return;
            }
            state.pins[idstr].value = val;
            broadcast_pin_updates([idstr], null);
        }, 100);
    };

    // update output pins when client has changed their values
    var update_pins = function(d) {
        log.debug('update pins from client info', JSON.stringify(d, null, 2));
        _.each(d.pins, function(pin, idstr) {
            var id  = parseInt(idstr);
            if ( state.pins[idstr].value !== pin.value
                 && !pin.is_input ) {
                var method = pin.is_analog ? 'analog' : 'digital';
                galileo[method+'Write'](id, pin.value);
            }
            _.extend(state.pins[idstr], pin);
        });
        broadcast_pin_updates(_.keys(d.pins), d.msg_id);
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
