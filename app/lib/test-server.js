var http = require('./http')();
http.listen(8000);

var socket = require('./socket').create();
socket.create(function() {});


