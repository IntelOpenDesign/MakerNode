var _ = require('underscore');
var log = require('./log').create('Socket');
var WebSocketServer = require('ws').Server;
var exec = require('child_process').exec;

var onUpdate;
var settings;
var msg;

function Socket(_settings){
    //TODO: Move initialization here...
    settings = _settings;
    msg = {
        status: 'OK', // TODO test client side with "error" status
        step: undefined,
        pins: {},
        connections: [],
        count: 0, // TODO remove when done debugging
        message_ids_processed: [],
        ssid: 'ConnectAnything',
    };
    _.each(digital_outs, pin_setter(false, false));
    _.each(digital_ins, pin_setter(false, true));
    _.each(analog_outs, pin_setter(true, false));
    _.each(analog_ins, pin_setter(true, true));
}

Socket.prototype.create = create;
Socket.prototype.getMessage = getMessage;
Socket.prototype.setMessage = setMessage;

module.exports = Socket;
module.exports.create = function(_settings){
    return new Socket(_settings);
}

// pin defaults
var digital_outs = ['1', '2', '3', '4', '7', '8', '12', '13'];
var digital_ins = ['0'];
var analog_outs = ['3', '5', '6', '9', '10', '11'];
var analog_ins = ['14', '15', '16', '17', '18', '19']; // A0 - A5

var all_pins = [].concat(digital_outs).concat(digital_ins).concat(analog_outs).concat(analog_ins);

function setMessage(state) {
    msg = state;
}

function getMessage() {
    return msg;
}

var messages_dict = {};

var N_CLIENTS = 0;

var change_ssid_message_id = null;

function pin_setter(is_analog, is_input) {
    return function(id) {
        msg.pins[id] = {
            label: '',
            value: 0,
            is_visible: Math.random() > 0.5 ? true : false,
            //is_visible: true,
            is_analog: is_analog,
            is_input: is_input,
            input_min: 0.0,
            input_max: 1.0,
            damping: 0,
            is_inverted: false,
            is_timer_on: false,
            timer_value: 0,
        };
    }
}

var broadcast_interval_id = 0;

var onConnect = function(conn) {

    N_CLIENTS += 1;
    log.info('new connection, N_CLIENTS', N_CLIENTS);
    if (!broadcast_interval_id) {
        broadcast_interval_id = setInterval(function() {
            msg.count += 1;
            msg.message_ids_processed = _.keys(messages_dict);
            msg.step = settings.get_step();
            try {
                conn.send(JSON.stringify(msg));
            } catch (error) {
                log.info(error);
                //TODO: do we need to recover here?
            }
            //log.info('sent message: ' + JSON.stringify(msg));
            _.each(_.keys(messages_dict), function(id) {
                messages_dict[id] += 1;
            });
            var message_ids_to_delete = _.filter(_.keys(messages_dict),
                function(id) {
                    return messages_dict[id] >= N_CLIENTS * 2;
                });
            _.each(message_ids_to_delete, function(id) {
                delete messages_dict[id];
                if (id === change_ssid_message_id) {
                    clearInterval(broadcast_interval_id);
                    log.info('clearing broadcast interval');
                }
            });
        }, 33); //TODO: Figure out the optimal value here
    }

    conn.on('message', function(str) {
        log.info('received ' + str);
        setTimeout(function() {
            //log.info('processing ' + str);
            var d = JSON.parse(str);
            _.each(d.connections, function(dc) {
                var index = -1;
                _.each(msg.connections, function(mc, i) {
                    if (mc.source === dc.source && mc.target === dc.target) {
                        index = i;
                    }
                });
                // if client wants to add connection && we don't already have it
                if (dc.connect && index < 0) {
                    msg.connections.push({
                        source: dc.source,
                        target: dc.target
                    });
                    // if client wants to remove connection && we have it
                } else if (!dc.connect && index >= 0) {
                    msg.connections.splice(index, 1);
                }
            });
            _.each(d.pins, function(pin, id) {
                msg.pins[id].value = pin.value;
                msg.pins[id].label = pin.label;
                msg.pins[id].is_visible = pin.is_visible;
                msg.pins[id].is_analog = pin.is_analog;
                msg.pins[id].is_input = pin.is_input;
                msg.pins[id].is_inverted = pin.is_inverted;
                msg.pins[id].input_min = pin.input_min;
                msg.pins[id].input_max = pin.input_max;
                msg.pins[id].damping = pin.damping;
                msg.pins[id].is_timer_on = pin.is_timer_on;
                msg.pins[id].timer_value = pin.timer_value;
            });
            log.info('processing message ID', d.message_id);
            messages_dict[d.message_id] = 0;
            if (_.has(d, 'ssid') && d.ssid !== msg.ssid) {
                // a user has changed the SSID. we should notify all other
                // users and then stop broadcasting, to mimic the users having
                // to reconnect to another wifi hotspot
                msg.ssid = d.ssid;
                var change_ssid_message_id = d.message_id;
            }
            if (_.has(d, 'mac_address')) {
                settings.confirm_network();
            }
            if (_.has(d, 'username') && _.has(d, 'user_password')) {
                settings.set_user_password();
            }
            if (_.has(d, 'wifi_ssid') && _.has(d, 'wifi_password')) {
                settings.set_router_info(d.wifi_ssid, d.wifi_password).then(function() {
                   // TODO app.js should really be the one to call this
                   var our_command = './init_supplicant.sh ' + d.wifi_ssid + ' ' + d.wifi_password;
				   if (settings.get_galileo_static_ip !== "") {
				     our_command += ' ' + settings.get_galileo_static_ip() + ' ' + settings.get_router_gateway_ip();
				   }
				   log.info('Attempting to init wlan0 with command: ' + our_command);
				   exec(our_command, function(error, stdout, stderr) {
                       // TODO clean this up
                       if (error === null) return;
                       log.error('INIT_SUPPLICANT.SH ERROR CALLBACK has error ', error,
                                 ' stdout ', stdout, ' stderr ', stderr);
                   });
                }, function(error) {
                    log.error('problem with wifi_ssid ' + d.wifi_ssid + ' wifi_password ' + d.wifi_password);
                });

            }
            onUpdate();
        }, 0);
    });

    conn.on('close', function(code, reason) {
        clearInterval(broadcast_interval_id);
        broadcast_interval_id = 0;
        try {
            log.info('close - try');
        } catch (e) {
            log.info('close - catch');
        } finally {
            log.info('close - finally');
        }
    });
    conn.on('end', function() {
        try {
            log.info('end - try');
        } catch (e) {
            log.info('end - catch');
        } finally {
            log.info('end - finally');
        }
    });
    conn.on('error', function() {
        log.info('error');
    });
}

function create(callback) {
    onUpdate = callback;

    var port = 8001;
    log.info('WebSockets Serving listening on port ' + port);
    wss = new WebSocketServer({
        port: port,
    });
    wss.on('connection', onConnect);
    //for testing random data
    //setInterval(update, 6000);
}

