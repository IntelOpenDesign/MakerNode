// This class provides a mechanism to synchronously execute shell commands via a queue.
"use strict";
var sys = require('sys');
var exec = require('child_process').exec;
var util = require('util');
var log = require('./log')('Command Queue');

module.exports = function() {
    var queue = [];

    var dequeue = function() {
        if (queue.length) {
            log.info(queue[0].cmd);
            var cp = exec(queue[0].cmd, function(error, stdout, stderr) {
                sys.print('[out] ' + stdout);
                if (error) {
                    log.error('exec error:', error);
                }
                if (queue[0].cb) {
                    queue[0].cb(error, stdout, stderr);
                }
                queue.shift();
                dequeue();
            });
        };
    };

    var enqueue = function(command, callback) {
        queue.push({cmd: command, cb: callback});
        if (queue.length == 1) {
            dequeue();
        }
    };

    return enqueue;
};
