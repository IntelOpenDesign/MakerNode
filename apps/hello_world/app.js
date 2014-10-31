//Import libraries
var utils = require('../../lib/utils/galileo')();
var path = require('path');
var Galileo = require("galileo-io");

//Initialize gpio communication with board
var board = new Galileo();

//The pin ID of the LED that will toggle
var pin = 13;

//The port for the server that will host the web page
//Port number should appear in the URL, e.g.: http://clanton.local:3000
var HTTP_PORT = 3000;

//Create HTTP and SOCKET servers
var servers = utils.create_servers(HTTP_PORT, path.join(__dirname, '/client'));
console.log('HTTP and WS servers listening on port', HTTP_PORT);

//Add event listener when a client connects to the socket server
servers.socketio_server.on('connect', handleConnect);

function handleConnect(conn) {
  console.log('client connected');
  //Add event listeners for pin_on and pin_off messages from the client.
  conn.on('pin_on', handlePinOn);
  conn.on('pin_off', handlePinOff);
}

function handlePinOn() {
  console.log('toggle_13 on');
  //turn the LED on
  board.digitalWrite(pin, 1);
}

function handlePinOff() {
  console.log('toggle_13 off');
  //turn the LED off
  board.digitalWrite(pin, 0);
}
