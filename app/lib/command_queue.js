// This class provides a mechanism to synchronously execute shell commands via a queue.
"use strict";
var sys = require('sys');
var exec = require('child_process').exec;
var util = require('util');
var self = this;

exports.init = function() {
    self.queue = [];
    return self;
}

exports.enqueue = function(command) {
    self.queue.push(command);
    if (self.queue.length == 1) {
        exports.dequeue();
    }
}

exports.dequeue = function() {
    if (self.queue.length) {
        console.log('[exec] ' + self.queue[0]);
        var cp = exec(self.queue[0], function(error, stdout, stderr) {
            self.queue.shift();
            sys.print('[out] ' + stdout);
            if (error !== null) {
                console.log('exec error: ' + error);
            }
            exports.dequeue();
        });
    }
}
