var utils = require('maker-node-utils/galileo')();
var log = require('maker-node-utils/log')('app')
var path = require('path');
var HOST = 'localhost';
var PORT = 3000;

var servers = utils.create_servers(PORT, path.join(__dirname, '/client'));
log.info('HTTP and WS servers listening on port', PORT);
