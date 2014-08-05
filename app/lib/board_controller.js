var log = require('./log')('BoardCtrl');
var conf = require('./conf').create();
var _ = require('underscore');
var GalileoF = require('galileo-io');

function board_controller(conf_filename, ws) {

    var state;   // board state JSON object, recorded in conf file
    var galileo; // communication with the actual Galileo using GPIO

    var start = function(cb) {
        log.info('Start Board Controller');
        // first read the conf file
        conf.read(conf_filename).then(function(o) {
            state = o;
            log.debug('done reading board state conf file');

            // second initialize Galileo IO
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
                log.debug('set up Galileo-IO');
            });

            // TODO put this in the galileo on ready callback so it happens
            // after we are able to update the galileo board based on client
            // updates (right now galileo io is broken so that callback never
            // happens, it seems)
            // third start handling websocket stuff that might require
            // updating pins
            ws.on('connection', function(conn) {
                // send client all the pin info
                conn.emit('pins', {pins: state.pins});

                // client is sending us a pin update
                conn.on('pins', update_pins);

                conn.on('disconnect', function() {
                    log.debug('client disconnected');
                });
            });
            log.debug('set up board controller websocket stuff');

            // fourth do the callback from app.js
            log.debug('about to do the on-done-starting callback');
            cb();

        }); // end of conf read then
    }; // end of start

    // only broadcast pins that have changed
    var broadcast_pin_updates = function(pin_idstrs, msg_id) {
        ws.emit('pins', {
            pins: _.pick(state.pins, pin_idstrs),
            msg_id_processed: msg_id,
        });
    };

    // update input pins when Galileo-IO reports they have changed value
    var pin_listener = function(id) {
        return _.throttle(function(id, val) {
            log.debug('Update pins from Galileo IO info id', id, 'val', val);
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
