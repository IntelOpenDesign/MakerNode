"use strict";
var _ = require('underscore');
var fs = require('q-io/fs');

function settings() {

    var filename;
    var state;
    var hardware = true;

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

    var get_hash_code = function() {
        if (!state.network_confirmed)
            return 'confirm_network';
        if (!state.user_password_set)
            return 'set_user_password';
        if (!state.router_ssid || state.router_ssid.length === 0 ||
            !state.router_password || state.router_password.length === 0)
            return 'set_router_info';
        return '';
    };

    var be_access_point = function() {
        return state.app_mode !== "control";
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
        state.app_mode = "control";
        return write();
    };

	var get_router_gateway_ip = function() {
		return state.router_gateway_ip;
	};

	var get_galileo_static_ip = function() {
		return state.galileo_static_ip;
	};

    var on_hardware = function(val) {
        if (val === undefined) {
            return hardware;
        } else if (val === true || val === false) {
            hardware = val;
        }
    };

    return {
        init: init,
        be_access_point: be_access_point,
        get_hash_code: get_hash_code,
        confirm_network: confirm_network,
        set_user_password: set_user_password,
        set_router_info: set_router_info,
		get_router_gateway_ip: get_router_gateway_ip,
	    get_galileo_static_ip: get_galileo_static_ip,
        on_hardware: on_hardware,
    };
}

module.exports = settings;
