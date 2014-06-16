"use strict;"

var namespace;

function Log(name) {
    namespace = name;
}

function create(namespace) {
    return new Log(namespace);
}

//TODO: Dict of log functions
var errorFunction;
var infoFunction;
var debugFunction;

function error(msg) {
    console.error('[' + namespace + ':ERROR] ' + msg);
    for (var i = 1; i < arguments.length; i++) {
        console.error(arguments[i]);
    }
}

function info(msg) {

    console.log('[' + namespace + ':INFO] ' + msg);
    for (var i = 1; i < arguments.length; i++) {
        console.log(arguments[i]);
    }
}

function debug(msg) {
    console.log('[' + namespace + ':DEBUG] ' + msg);
    for (var i = 1; i < arguments.length; i++) {
        console.log(arguments[i]);
    }
}

Log.prototype.error = error;
Log.prototype.info = info;
Log.prototype.debug = debug;
module.exports = Log;
module.exports.create = create;
