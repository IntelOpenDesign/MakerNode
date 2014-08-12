"use strict";
var fs = require('q-io/fs');
var log = require('mnutils/log')('Conf');

module.exports = function() {
    var read = function(path) {
        log.info('Reading:', path);
        return fs.read(path).then(
            JSON.parse,
            function(reason) {
                log.error('Could not read file', path, 'for reason', reason);
            }
        );
    };

    var write = function(path, content) {
        log.info('Writing:', path);
        return fs.write(path, JSON.stringify(content, null, 2)).then(
            function() {
                log.info('Write to', path, 'successful.');
            },
            function() {
                log.error('Could not write file', path, 'for reason', reason);
            }
        );
    };

    return {
        read: read,
        write: write,
    };
};

