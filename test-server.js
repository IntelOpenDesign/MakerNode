// https://www.npmjs.org/package/nodejs-websocket

var n_pins = 20;
var pin_states = [];
function update_pin_states() {
    for (var i = 0; i < n_pins; i++) {
        pin_states[i] = Math.random();
    }
}
update_pin_states();
setInterval(update_pin_states, 10000);

var ws = require('nodejs-websocket');

var server = ws.createServer(function(conn){
    console.log('new connection', conn);
    /*
    conn.on('text', function(str) {
        console.log('received ' + str);
        conn.sendText(str.toUpperCase()+'!!!');
    });
    */
    setInterval(function() {
        conn.sendText(pin_states.join(','));
    }, 5000);
    conn.on('close', function(code, reason) {
        console.log('connection', conn,'closed with code', code, 'for reason', reason);
    });
}).listen(8001);
