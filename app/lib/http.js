var log = require('./log').create('HTTP');
var httpServer = require("http-server");
var server;

function http() {
    server = httpServer.createServer({
        root: 'client',
        cache: -1,
        showDir: true,
    });
};

module.exports = function() {
    return new http;
}

http.prototype.listen = function(port) {
    log.info('HTTP Server listening on port ' + port);
    server.listen(port);
}

http.prototype.close = function() {
    server.close();
}

//TODO: I don't like that http-server is synchronous, so we should swap it out with the connect or express modules.
