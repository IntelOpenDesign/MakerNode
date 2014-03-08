
var _und = require('./static/js/underscore-min.js');
var ws = require('nodejs-websocket');

// initialize msg with pin defaults
var digital_outs = ['0', '1', '2', '3', '4', '7', '8', '12', '13'];
var digital_ins = [];
var analog_outs = ['3', '5', '6', '9', '10', '11'];
var analog_ins = ['14', '15', '16', '17', '18', '19']; // A0 - A5

var all_pins = [].concat(digital_outs).concat(digital_ins).concat(analog_outs).concat(analog_ins);

var msg = {
    status: 'OK', // TODO test client side with "error" status
    pins: {},
    connections: [{source: '14', target: '1'}],
};

function pin_setter(is_analog, is_input) {
    return function(id) {
        msg.pins[id] = {
            label: 'Pin ' + id,
            value: 0,
            is_visible: true,
            is_analog: is_analog,
            is_input: is_input,
            sensitivity: 0.5,
            is_inverted: false,
        };
    }
}

_und.each(digital_outs, pin_setter(false, false));
_und.each(digital_ins,  pin_setter(false, true));
_und.each(analog_outs,  pin_setter(true, false));
_und.each(analog_ins,   pin_setter(true, true));

// change state randomly to simulate other users and hardware
function update() {
    _und.each(all_pins, function(id) {
        if (msg.pins[id].is_analog) {
            msg.pins[id].value = Math.random();
        } else {
            msg.pins[id].value = Math.random() < 0.5 ? 0 : 1;
        }
    });
}

setInterval(update, 6000);

var server = ws.createServer(function(conn){
    console.log('new connection');
    conn.on('text', function(str) {
        console.log('received ' + str);
        var d = JSON.parse(str);
        _und.each(d.connections, function(dc) {
            var index = -1;
            _und.each(msg.connections, function(mc, i) {
                if (mc.source === dc.source && mc.target === dc.target) {
                    index = i;
                }
            });
            if (index >= 0) {
                msg.connections.splice(index, 1);
            } else {
                msg.connections.push({
                    source: dc.source,
                    target: dc.target
                });
            }
        });
        _und.each(d.pins, function(pin, id) {
            msg.pins[id].label = pin.label;
            msg.pins[id].is_visible = pin.is_visible;
            msg.pins[id].is_analog = pin.is_analog;
            msg.pins[id].is_input = pin.is_input;
            msg.pins[id].sensitivity = pin.sensitivity;
            msg.pins[id].is_inverted = pin.is_inverted;
        });
    });
    setInterval(function() {
        console.log('broadcasting state');
        conn.sendText(JSON.stringify(msg));
    }, 3000);
    conn.on('close', function(code, reason) {
        console.log('connection', conn,'closed with code', code, 'for reason', reason);
    });
}).listen(8001);

// https://www.npmjs.org/package/nodejs-websocket
