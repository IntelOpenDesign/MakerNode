var utils = require('../../lib/utils/galileo')();
var path = require('path');
var Galileo = require("galileo-io");
var board = new Galileo();
var pin = 13;
var HOST = 'localhost';
var PORT = 3000;

var servers = utils.create_servers(PORT, path.join(__dirname, '/client'));
console.log('HTTP and WS servers listening on port', PORT);

servers.socketio_server.on('connect', handleConnect);

function handleConnect(conn) {
  console.log('client connected');
  conn.on('pin_on', handlePinOn);
  conn.on('pin_off', handlePinOff);
}

function handlePinOn() {
  console.log('toggle_13 on');
  board.digitalWrite(pin, 1);
}
function handlePinOff() {
  console.log('toggle_13 off');
  board.digitalWrite(pin, 0);
}
