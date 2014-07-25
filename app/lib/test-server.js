var http = require('./http')();
var socket_lib = require('./socket');
var socket;
var settings = require('./settings')();

// REFACTOR_IDEA make app.js take an option to run in local test mode, where we don't actually talk to the board. I feel like this could be pretty much exactly the same except for the choice of "real Galileo IO" versus "fake Galileo IO" module

settings.init('appstate.conf').then(function() {
    settings.on_hardware(false);
    socket = socket_lib.create(settings);
    http.listen(8000);
    socket.create(function() {});
});
