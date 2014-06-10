"use strict";
var fs = require('q-io/fs');

function Conf() {
    console.log('New Conf');
}

function create() {
    return new Conf();
}

function read(path) {
    console.log('Reading: ' + path);
    return fs.read(path).then(JSON.parse,
        function(reason) {
            console.log('Could not read file. ' + reason);
        }
    );
}

function write(path, content) {
    console.log('Writing to: ' + path);

    return fs.write(path, content)
        .then(
            function() {
                console.log('Write successful.');
            },
            function(reason) {
                console.log('Write failed: ' + reason);
            }
    );
}

Conf.prototype.read = read;
Conf.prototype.write = write;
module.exports = Conf;
module.exports.create = create;
