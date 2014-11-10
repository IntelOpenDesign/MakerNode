doc = function() {
/*!
Usage: 
index.js [--port=<port>] 
*/
}
var docopt = require ('docopt-js-shim');
var args = docopt.fromComment(doc);
var port = args['--port'];

var app = require('./lib/app')();
app.start(port ? port : 80);

