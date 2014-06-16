"use strict";
var _ = require('underscore');
var fs = require('q-io/fs');

function settings() {

    var filename;
    var state;

    var init = function(_filename) {
        filename = _filename;
        return read();
    };

    var read = function() {
        return fs.read(filename).then(function(value) {
            try {
                state = JSON.parse(value);
            } catch(e) {
                console.log('\nERROR !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n' +
                    e + '\n' +
                    'when doing JSON.parse on file ' + filename + '\n' +
                    'which has contents\n' +
                    value);
            }
        });
    };

    var write = function() {
        return fs.write(filename, JSON.stringify(state));
    };

    var get_mode = function() {
        if (!state.network_confirmed)
            return 'confirm_network';
        if (!state.user_password_set)
            return 'set_user_password';
        if (!state.router_ssid || state.router_ssid.length === 0 ||
            !state.router_password || state.router_password.length === 0)
            return 'set_router_info';
        return 'app';
    };

    var be_access_point = function() {
        return get_mode() !== "app";
    };

    var confirm_network = function() {
        state.network_confirmed = true;
        return write();
    };

    var set_user_password = function() {
        state.user_password_set = true;
        return write();
    };

    var set_router_info = function(ssid, pw) {
        state.router_ssid = ssid;
        state.router_password = pw;
        return write();
    };

    return {
        init: init,
        be_access_point: be_access_point,
        get_mode: get_mode,
        confirm_network: confirm_network,
        set_user_password: set_user_password,
        set_router_info: set_router_info,
    };
}

module.exports = settings;
