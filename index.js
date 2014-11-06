doc = function() {
/*!
Usage: 
index.js [--port=<port>] 
*/
}
var docopt = require ('docopt-js-shim');
var args = docopt.fromComment(doc);
console.log(args);
var port = args['--port'];

var app = require('./lib/app')();
app.start(port ? port : 80);
