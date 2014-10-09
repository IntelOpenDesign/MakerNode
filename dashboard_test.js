var utils = require('./utils/galileo')();
  var path = require('path');
var HOST = 'localhost';
var PORT = 8005;

var servers = utils.create_servers(PORT, path.join(__dirname, './client'));
servers.socketio_server.on('connect', function(conn) {
  require('./lib/dashboard_controller')(conn);
});

