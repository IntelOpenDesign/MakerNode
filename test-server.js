
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
    connections: [],
};

function pin_setter(is_analog, is_input) {
    return function(id) {
        msg.pins[id] = {
            label: 'Pin ' + id,
            value: 0,
            is_visible: true,
            is_analog: is_analog,
            is_input: is_input,
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
    console.log('new connection', conn);
    conn.on('text', function(str) {
        console.log('received ' + JSON.parse(str));
    });
    setInterval(function() {
        conn.sendText(JSON.stringify(msg));
    }, 5000);
    conn.on('close', function(code, reason) {
        console.log('connection', conn,'closed with code', code, 'for reason', reason);
    });
}).listen(8001);

// https://www.npmjs.org/package/nodejs-websocket
