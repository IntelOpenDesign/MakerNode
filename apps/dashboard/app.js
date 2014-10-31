doc = function() {
/*!
Usage: 
dashboard.js [--port=<port>] 
*/
}
var docopt = require ('docopt-js-shim');
var args = docopt.fromComment(doc);
var port = args['--port'];

var utils = require('../../lib/utils/galileo')();
var path = require('path');

var servers = utils.create_servers(port ? port : 80, path.join(__dirname, 'client'));
servers.socketio_server.on('connect', function(conn) {
  require('./dashboard_controller')(conn);
});

