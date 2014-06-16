var http = require('./http')();
var socket_lib = require('./socket');
var socket;
var settings = require('./settings')();

settings.init('appstate.conf').then(function() {
    socket = socket_lib.create(settings);
    http.listen(8000);
    socket.create(function() {});
});
