"use strict;"
var clc = require('cli-color');

var log_types = {
    info : {
        color: 'blue',
        console: 'log',
        prefix: 'INFO',
    },
    error: {
        color: 'red',
        console: 'error',
        prefix: 'ERROR',
    },
    debug: {
        color: 'blackBright',
        console: 'error',
        prefix: 'DEBUG',
    },
};

function log(name) {
    var logger = function(type) {
        // TODO make sure this prints JSON nicely
        var t = log_types[type];
        return function() {
            var prefix = '[' + name + ':' + t.prefix + ']';
            var msg = '';
            for (var i = 0; i < arguments.length; i++) {
                msg += ' ' + arguments[i];
            }
            console[t.console](clc[t.color].bold(prefix) + clc[t.color](msg));
        };
    };

    return {
        info: logger('info'),
        debug: logger('debug'),
        error: logger('error'),
    };
};

module.exports = log;
