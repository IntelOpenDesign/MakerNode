"use strict";
var fs = require('q-io/fs');
var log = require('./log').create('Conf');

function Conf() {
    log.info('New Conf');
}

function create() {
    return new Conf();
}

function read(path) {
   log.info('Reading: ' + path);
    return fs.read(path).then(JSON.parse,
        function(reason) {
            log.error('Could not read file. ' + reason);
        }
    );
}

function write(path, content) {
    log.info('Writing to: ' + path);

    return fs.write(path, content)
        .then(
            function() {
                log.info('Write successful.');
            },
            function(reason) {
                log.error('Write failed: ' + reason);
            }
    );
}

Conf.prototype.read = read;
Conf.prototype.write = write;
module.exports = Conf;
module.exports.create = create;
