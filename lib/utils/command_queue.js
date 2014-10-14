"use strict";
var sys = require('sys');
var exec = require('child_process').exec;
var log = require('./log')('Command Queue', 'command_queue.log');

/**
 * This module provides a mechanism to synchronously execute shell commands via a queue.
 * @constructor command_queue
 **/
module.exports = function() {
    var queue = [];

    /**
     * Execute the next shell command in the queue. 
     * @memberOf command_queue
     * @method dequeue
     * @return void
     */
    var dequeue = function() {
     	    if (queue.length > 0) {
            log.info(queue[0].cmd);
            var cp = exec(queue[0].cmd, function(error, stdout, stderr) {
                log.debug('[out] ' + stdout);
                if (error) {
                    log.error('exec error:', error);
                }
                if (queue[0].cb) {
                    setTimeout(queue[0].cb, 1, error, stdout, stderr);
                }
                queue.shift();
		dequeue();
            });
        };
    };

    /**
     * Add a shell command to the queue
     * @memberOf command_queue
     * @method enqueue
     * @param string command 
     * @param {} callback An optional callback to exectue when the command is done. 
     * Use the form void->(error, stdout, stderr)
     * @return void
     */
    var enqueue = function(command, callback) {
	    queue.push({cmd: command, cb: callback});
	if (queue.length == 1) {
            dequeue();
        }
    };

    return enqueue;
};
