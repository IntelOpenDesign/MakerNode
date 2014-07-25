"use strict;"
var clc = require('cli-color');

// REFACTOR_IDEA log to a file instead of (or in addition to) the console
// REFACTOR_IDEA support different levels of logging

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

// REFACTOR_IDEA these logging functions are all pretty much the same function so just use a dictionary lookup to choose between clc.red.bold, clc.blue.bold, and clc.blackBright.bold, ie clc['color'].bold, and instead of console.log or console.error just do console['type']

function error(msg) {
    console.error(clc.red.bold('[' + namespace + ':ERROR] ') + clc.red(msg));
    for (var i = 1; i < arguments.length; i++) {
        console.error(arguments[i]);
    }
}

function info(msg) {

    console.log(clc.blue.bold('[' + namespace + ':INFO] ') + msg);
    for (var i = 1; i < arguments.length; i++) {
        console.log(arguments[i]);
    }
}

function debug(msg) {
    console.log(clc.blackBright.bold('[' + namespace + ':DEBUG] ') + clc.blackBright(msg));
    for (var i = 1; i < arguments.length; i++) {
        console.log(arguments[i]);
    }
}

Log.prototype.error = error;
Log.prototype.info = info;
Log.prototype.debug = debug;
module.exports = Log;
module.exports.create = create;
