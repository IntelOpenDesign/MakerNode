"use strict;"
var clc = require('cli-color');
var fs = require('fs');

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

function log(name, dest) {
    var have_written_prefix = false;

    var write_msg = function(t, msg) {
        if (msg !== '') {
            var timestamp = new Date().toTimeString();

            var prefix = '[' + timestamp.substring(0, timestamp.indexOf(' ')) + " " + name + ':' + t.prefix + ']';
            if (dest) {
              write_to_file(prefix + msg);
            }
            else { 
                console[t.console](clc[t.color].bold(prefix) + clc[t.color](msg));
            }
            have_written_prefix = true;
        }
    };

    var write_obj = function(t, obj) {
        if (!have_written_prefix) {
            write_msg(t, ' ');
        }
        if (dest) {
          write_to_file(JSON.stringify(obj));
        }
        else {
          console[t.console](obj);
        }
    };

    var write_to_file = function(line) {
            fs.appendFile(dest, line + '\n', function(err) {
         if (err) {
             throw err;
         }
      }); 
    }

    var logger = function(type) {
        // TODO make sure this prints JSON nicely
        var t = log_types[type];
        return function() {
            have_written_prefix = false;
            var msg = '';
            for (var i = 0; i < arguments.length; i++) {
                var data_type = typeof(arguments[i]);
                if (data_type === "string" ||
                    data_type === "number" ||
                    data_type === "undefined" ||
                    arguments[i] === null) {
                    msg += ' ' + arguments[i];
                } else {
                    write_msg(t, msg);
                    write_obj(t, arguments[i]);
                    msg = '';
                }
            }
            write_msg(t, msg);
        };
    };

    return {
        info: logger('info'),
        debug: logger('debug'),
        error: logger('error'),
    };
};

module.exports = log;
