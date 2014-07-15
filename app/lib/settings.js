"use strict";
var _ = require('underscore');
var fs = require('q-io/fs');
// REFACTOR_IDEA don't have conf.js be a wrapper for q-io/fs and then have setting.js just use q-io/fs directly. either get rid of conf.js or have settings.js use it too

// REFACTOR_IDEA along the lines of wanting to write modules in a consistent fashion, this would be my vote for how to write functions and modules
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
                // REFACTOR_IDEA use the logging system for this not console.log
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

    // REFACTOR_IDEA sync up the 'server code' names for different pages with the client side route and template names, after things are a bit more finalized in the user flow. discrepancies won't cause bugs because the client side handles that, but it is a little weird
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

    // REFACTOR_IDEA in general I like hiding the internal module logic, even if it means having a bunch of long winded getter/setter/checker functions. If the application logic were more finalized, clear cut, and could provide a nice consistent abstract understanding throughout all components, then I think directly exposing attributes in settings would be fine. But for right now I think this is safer.
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

    // REFACTOR_IDEA for writing functions in JavaScript, I usually return an object like this at the end or just return a "that" object to which I have attached all the public methods. This way makes it easier for the coder to change which methods are public, and it makes it so someone using this class can't change the original function
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
