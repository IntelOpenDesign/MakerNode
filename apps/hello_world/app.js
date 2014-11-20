var utils = require('../../lib/utils/galileo')();
var log = require('../../lib/utils/log')('app')
var path = require('path');
var Galileo = require("galileo-io");
var board = new Galileo();
var pin = 13;
var byte = 0;

var HOST = 'localhost';
var PORT = 3000;

var servers = utils.create_servers(PORT, path.join(__dirname, '/client'));
log.info('HTTP and WS servers listening on port', PORT);

servers.socketio_server.on('connect', function(conn) {
  log.debug('client connected');
  conn.on('toggle_13', function(conn) {
    log.debug('toggle_13');
    board.digitalWrite(pin, (byte ^= 1));
  });
});
