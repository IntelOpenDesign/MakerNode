var makernode = {};

makernode.app = angular.module('MakerNode', ['ngRoute']);

makernode.routes = {
    init: {
        hash: '',
        server_code: null,
        controller: 'EmptyCtrl',
        template: 'empty',
    },
    confirm_mac: {
        hash: 'confirm_network',
        server_code: 'confirm_network',
        controller: 'FormCtrl',
        template: 'confirm_mac',
    },
    wifi_setup: {
        hash: 'wifi_router_setup',
        server_code: 'set_router_info',
        controller: 'FormCtrl',
        template: 'wifi_setup',
    },
    create_user: {
        hash: 'create_password',
        server_code: 'set_user_password',
        controller: 'FormCtrl',
        template: 'create_user',
    },
    connecting: {
        hash: 'connecting',
        server_code: '',
        controller: 'EmptyCtrl',
        template: 'connecting_to_router',
    },
    control_mode: {
        hash: 'controller',
        server_code: '',
        controller: 'EmptyCtrl',
        template: 'home',
    },
};

makernode.app.config(['$routeProvider', function($routeProvider) {
    _.each(makernode.routes, function(o, route) {
        $routeProvider.when('/' + o.hash, {
            templateUrl: 'templates/' + o.template + '.html',
            controller: o.controller,
        });
    });
}]);

// the highest level app controller from which all others inherit
makernode.app.controller('AppCtrl', ['$scope', 'Galileo', function($scope, Galileo) {

    window.$scope = $scope;

    $scope.routes = makernode.routes;
    $scope.parseInt = parseInt;
    $scope.static_IP = makernode.static_IP;

    $scope.d = makernode.d();
    $scope.s = {
        got_data: false,
        error_state: false,
    };


    // set up connection with server
    Galileo.set_all_pins_getter(function() {
        return $scope.d.pins;
    });
    Galileo.on('update', function(data) {
        if (!$scope.s.got_data) { // first time initialization
            $scope.s.got_data = true;
            $scope.d.reset(data);
            makernode.rc.reset(data);
        } else {
            $scope.s.got_data = true;
            $scope.d.update(data);
            makernode.rc.update(data);
        }

        if (window.location.origin !== data.url_root) {
            makernode.rc.connect_to(
        }

        // server can suggest routes but does not specify all routes
        var route_key_from_server = makernode.get_route_key(data.step, 'server_code');
        var current_route_key = $scope.currentRouteKey();
        var server_suggested_route = makernode.routes[route_key_from_server];
        var current_route = makernode.routes[current_route_key];
        if (server_suggested_route.is_setup_step) {
            if (route_key_from_server !== current_route_key) {
                $scope.goTo(server_suggested_route);
            }
            return;
        }
        if (data.step === 'app') {
            if (makernode.rc.is_connected()) {
                $scope.goTo(makernode.routes.control_mode);
            } else {
                $scope.goTo(makernode.routes.connecting_via_router);
            }
        }
        if (current_route_key === 'connecting_via_router') {
            console.log('at route connecting_via_router, makernode.rc.is_connected()', makernode.rc.is_connected(), 'makernode.rc.is_connecting()', makernode.rc.is_connecting());
            if (!makernode.rc.is_connected() &&
                !makernode.rc.is_connecting()) {
                makernode.rc.connect(function error_callback() {
                    $scope.s.error_state = true;
                }, makernode.routes.control_mode.hash);
            }
            return;
        }
    });
    Galileo.on('slowness', function() {
        $scope.s.got_data = false;
    });
    Galileo.on('websocket-closed', function() {
        $scope.s.got_data = false;
    });
    Galileo.connect(makernode.get_websocket_url());

    // This sends the object d to the server exactly as is.
    // Only use this if you know the server is expecting this exact format.
    // For modifying pins and connections, use specific helper functions.
    $scope.send_server_update = function(d) {
        Galileo.send_data(d);
    };

    // general purpose pin update
    // NOTE do not use for showing or hiding pins
    $scope.send_pin_update = function(pin_ids, attr, val) {
        if (arguments.length >= 3) {
            _.each(pin_ids, function(id) {
                $scope.d.pins[id][attr] = val;
            });
        }
        Galileo.update_pins(pin_ids, attr);
    };

    $scope.toggle_pin_value = function(id) {
        var pin = $scope.d.pins[id];
        if (pin.is_input) return;
        var new_val = pin.value === 100 ? 0 : 100;
        $scope.send_pin_update([id], 'value', new_val);
    };

    $scope.confirmation = function(msg, f) {
        if (confirm(msg)) {
            f();
        }
    };
    $scope.send_server_reset = function() {
        alert('TODO: actually send server reset');
    };
}]);

makernode.app.controller('EmptyCtrl', ['$scope', function($scope) {
}]);

makernode.app.controller('FormCtrl', ['$scope', function($scope) {
    $scope.form = {};
    $scope.submit = function() {
        $scope.send_server_update($scope.form);
    };
}]);

makernode.app.directive('stepsPics', function($document) {
    function link($scope, $el, attrs) {
        $scope.attrs = attrs; // TODO is this necessary?
        $scope.attrs.step = parseInt(attrs.step);
    }
    return { templateUrl: 'templates/steps_pics.html', link: link };
});

makernode.app.directive('pinButton', function($document) {
    return { templateUrl: 'templates/pin_button.html' };
});

makernode.app.directive('pinSlider', function($document) {
    return { templateUrl: 'templates/pin_slider.html' };
});

// SERVER COMMUNICATION

makernode.app.factory('Galileo', ['$rootScope', function($rootScope) {

    //Settings:
    //  used in log statements, should match the module name
    var name = 'Galileo';
    //  wait this long between attempts to connect with server
    var reconnect_attempts_period = 500;
    //  if the we go all of slowness_time without getting an update from the
    //  server, we start to get suspicious that the server is malfunctioning
    var slowness_time = 15000;
    //  we send updates to the server at most once every update_period
    var update_period = 500;
    //(end of settings)

    // Callback Functions
    // for certain "events" you can assign exactly one callback function. they
    // are not real events; the strings just describe the situation in which
    // that callback function will be done
    var callbacks = {
        'websocket-opened': function() {}, // no args
        'update': function() {},           // gets one arg, the update data
        'slowness': function() {},         // no args
        'websocket-closed': function() {}, // no args
    };

    var on = function(e, f) { // assign callback functions
        if (!_.has(callbacks, e)) {
            throw name + ".on: " + e + " is not a valid callback type. You can assign exactly one callback for each of the types in " + JSON.stringify(_.keys(callbacks));
        } else {
            callbacks[e] = f;
        }
    };

    var do_callback = function(e, arg) {
        $rootScope.$apply(function() {
            callbacks[e](arg);
        });
    };

    // Maintaining Connection with Server

    var ws, url, protocol; // websocket, URL, protocol

    var connect = function(_url, _protocol) {
        url = _url;
        protocol = _protocol;
        try {
            if (!protocol) {
                ws = new WebSocket(url);
            } else {
                ws = new WebSocket(url, protocol);
            }
            ws.onopen = onopen;
            ws.onmessage = onmessage;
            ws.onclose = onclose;
            start_waiting();
        } catch(err) {
            reconnect('.connect failed with error', err);
        }
    };

    var reconnect = function(error_description) {
        console.log(name, error_description, 'Trying again in', reconnect_attempts_period, 'ms...');
        setTimeout(function() {
            connect(url, protocol);
        }, reconnect_attempts_period);
    };

    var onopen = function() {
        console.log(name, 'websocket opened');
        messages = {};
        do_callback('websocket-opened');
    };

    var onclose = function() {
        // NOTE that if a "new WebSocket" call has valid parameters, but the
        // server is not running, that will trigger onclose and will not throw
        // an error
        stop_waiting();
        do_callback('websocket-closed');
        reconnect('websocket closed');
    };

    // Sending Updates to Server
    var messages = {}; // messages client side has sent to server
    var batch = null;  // the next batch of updates we will send to server
    var client_id = Date.now().toString();
    var message_count = 0;

    var _send = function() {
        var now = Date.now();
        message_count += 1; // TODO roll back to 0 at some point
        var message_id = message_count + '-' + client_id + '-' + now;
        messages[message_id] = {
            time: now,
            message_id: message_id,
            stringified_updates: JSON.stringify(batch),
        };
        // TODO i think i used to just send connections or pins if there were updates for them.
        var msg_for_server = {
            status: 'OK',
            message_id: message_id,
        };
        // add pins to msg_for_server
        msg_for_server.pins = makernode.server_pin_format(get_all_pins(), _.keys(batch.pins));
        // all other attrs of batch (including connections) can just be added
        // to msg_for_server directly
        delete batch.pins;
        msg_for_server = _.extend(msg_for_server, batch);
        ws.send(JSON.stringify(msg_for_server));
        batch = null;
    };

    var send = _.throttle(_send, update_period);

    var add_to_batch = function(updates) {
        batch = _.extend({ pins: {}, connections: [] }, batch);
        // add pin updates to batch
        _.each(updates.pins, function(pin, id) {
            batch.pins[id] = _.extend({}, batch.pins[id], pin);
        });
        // TODO remove redundant add/remove connection updates before sending out batch
        // add connection updates to batch
        batch.connections.push.apply(batch.connections, updates.connections);
        // all other attrs of updates can just be added to batch directly
        delete updates.pins;
        delete updates.connections;
        batch = _.extend(batch, updates);
        send();
    };

    var send_data = function(d) {
        add_to_batch(d);
    };

    var update_pins = function(ids, attr) {
        var all_pins = get_all_pins();
        var updates = { pins: {} };
        _.each(ids, function(id) {
            updates.pins[id] = {};
            updates.pins[id][attr] = all_pins[id][attr];
        });
        add_to_batch(updates);
    };

    var update_connections = function(connections, bool) {
        var updates = { connections: [] };
        updates.connections = _.map(connections, function(c) {
            return { source: c.source, target: c.target, connect: bool };
        });
        add_to_batch(updates);
    };

    var add_connections = function(connections) {
        update_connections(connections, true);
    };

    var remove_connections = function(connections) {
        update_connections(connections, false);
    };

    // Processing Updates from Server
    var onmessage = function(server_msg) {
        stop_waiting();

        // TODO put these back in for deployment ?
        //console.log('websocket message', server_msg);
        var data = JSON.parse(server_msg.data);
        //console.log('websocket data', data);
        //console.log('\tdata.message_ids_processed', JSON.stringify(data.message_ids_processed));

        // forget about the messages we created that the server has processed
        _.each(data.message_ids_processed, function(message_id) {
            delete messages[message_id];
        });

        // the remaining messages, and the batch of updates that we have not
        // even sent to the server yet, are all ways in which the data from the
        // server is out of date. so, first we take the data from the server,
        // and then we update it based on our remaining messages and the batch

        var pins = makernode.my_pin_format(data.pins, data.connections);
        var conns = _.object(_.map(data.connections, function(c) {
            return [makernode.tokenize_connection_object(c), true];
        }));
        delete data.pins;
        delete data.connections;
        var other_attrs = data;

        function update(JSON_d) {
            var d = JSON.parse(JSON_d);
            _.each(d.pins, function(pin_updates, pin_id) {
                pins[pin_id] = _.extend(pins[pin_id], pin_updates);
            });
            _.each(d.connections, function(c) {
                conns[makernode.tokenize_connection_object(c)] = c.connect;
            });
            delete d.pins;
            delete d.connections;
            other_attrs = _.extend(other_attrs, d);
        }

        var messages_in_order = _.sortBy(_.values(messages), function(msg) {
            return msg.time;
        });
        _.each(messages_in_order, function(msg) {
            //console.log('updating server data with message_id', msg.message_id, 'update', msg.stringified_updates);
            update(msg.stringified_updates);
        });
        if (batch !== null) {
            update(JSON.stringify(batch));
        }

        var connections = [];
        _.each(conns, function(val, token) {
            if (val)
                connections.push(makernode.detokenize_connection(token));
        });

        do_callback('update', _.extend({
            pins: pins,
            connections: connections,
        }, other_attrs));

        //console.log('\n\n');
        start_waiting();
    };

    // if there is a big lag time (>= slowness_time) between messages from the
    // server, we start to get suspicious that the server is malfunctioning,
    // and so we do the slowness callback
    var slowness_timeout_id = null;
    var start_waiting = function() {
        slowness_timeout_id = setTimeout(function() {
            console.log(name, 'is being too slow');
            messages = {};
            do_callback('slowness');
        }, slowness_time);
    };
    var stop_waiting = function() {
        if(slowness_timeout_id !== null) {
            clearTimeout(slowness_timeout_id);
            slowness_timeout_id = null;
        }
    };

    // it's convenient to be able to tell Galileo to only update certain pins
    // by passing in the IDs of those pins, not the whole pin object. but that
    // means Galileo needs to be able to access a pin object from just its ID.
    // so, the controller exposes a way to let Galileo see the pins dict.
    // Galileo should only use this in a read only way.
    var get_all_pins = null;
    var set_all_pins_getter = function(f) {
        get_all_pins = f;
    };

    return {
        on: on,
        connect: connect,
        update_pins: update_pins,
        add_connections: add_connections,
        remove_connections: remove_connections,
        set_all_pins_getter: set_all_pins_getter,
        send_data: send_data,
    };

}]);

// DATA THAT IS SYNCED WITH SERVER
// pins, connections
makernode.d = function() {
    var that = {};
    that.pins = {};
    that.connections = [];

    // these are convenient for templates, and are kept in sync with pins
    that.sensors = [];
    that.actuators = [];
    that.visible_sensors = [];
    that.visible_actuators = [];
    that.visible_actuators_no_connections = [];

    var sync = function() {
        // sync pin connectedness
        _.each(that.pins, function(pin) {
            pin.is_connected = false;
        });
        _.each(that.connections, function(c) {
            that.pins[c.source].is_connected = true;
            that.pins[c.target].is_connected = true;
        });

        // sync pin lists
        var sen = [], act = [], vissen = [], visact = [], visactnoc = [];
        _.each(that.pins, function(pin, id) {
            if (pin.is_input) {
                sen.push(pin);
                if (pin.is_visible) {
                    vissen.push(pin);
                }
            } else {
                act.push(pin);
                if (pin.is_visible) {
                    visact.push(pin);
                    if (!pin.is_connected) {
                        visactnoc.push(pin);
                    }
                }
            }
        });
        that.sensors = sen;
        that.actuators = act;
        that.visible_sensors = vissen;
        that.visible_actuators = visact;
        that.visible_actuators_no_connections = visactnoc;
    };

    that.reset = function(data) {
        that.pins = data.pins;
        that.connections = data.connections;
        sync();
    };

    that.update = function(data) {
        _.each(data.pins, function(pin, id) {
            _.each(pin, function(val, attr) {
                that.pins[id][attr] = val;
            });
        });

        var my_tokens = _.map(that.connections, makernode.tokenize_connection_object);
        var new_tokens = _.map(data.connections, makernode.tokenize_connection_object);
        var tokens_to_remove = _.difference(my_tokens, new_tokens);
        var tokens_to_add = _.difference(new_tokens, my_tokens);
        var conns_to_remove = _.map(tokens_to_remove, makernode.detokenize_connection);
        var conns_to_add = _.map(tokens_to_add, makernode.detokenize_connection);

        that.disconnect(conns_to_remove);
        that.connect(conns_to_add);

        sync();
    };

    that.disconnect = function(connections) {
        var conns_dict = {};
        _.each(connections, function(c) {
            if (conns_dict[c.source] === undefined)
                conns_dict[c.source] = {};
            conns_dict[c.source][c.target] = true;
        });
        var indices = [];
        _.each(that.connections, function(c, i) {
            if (conns_dict[c.source] && conns_dict[c.source][c.target]) {
                indices.push(i);
            }
        });
        indices.sort(function(x, y) { return y - x; }); // descending order
        _.each(indices, function(index) {
            that.connections.splice(index, 1);
        });
        sync();
    };

    that.connect = function(connections) {
        that.connections.push.apply(that.connections, connections);
        sync();
    };

    that.are_connected = function(sensor, actuator) {
        for (var i = 0; i < that.connections.length; i++) {
            var c = that.connections[i];
            if (c.source === sensor && c.target === actuator) {
                return true;
            }
        }
        return false;
    };

    that.show_pins = function(ids) {
        _.each(ids, function(id) {
            that.pins[id].is_visible = true;
        });
        sync();
    };

    that.hide_pins = function(ids) {
        var affected_conns = [];
        _.each(ids, function(id) {
            that.pins[id].is_visible = false;
            var end = that.pins[id].is_input ? 'source' : 'target';
            var more_conns = _.filter(that.connections, function(c) {
                return c[end] === id;
            });
            affected_conns.push.apply(affected_conns, more_conns);
        });

        sync();
        return affected_conns;
    };

    return that;
};

// UTILITY FUNCTIONS

// tokenize connections
makernode.tokenize_connection_pins = function(sensor, actuator) {
    return sensor + '-' + actuator;
};
makernode.tokenize_connection_object = function(c) {
    return makernode.tokenize_connection_pins(c.source, c.target);
};
makernode.detokenize_connection = function(s) {
    var pins = s.split('-');
    return {source: pins[0], target: pins[1]};
};

// translate the server's pin format into my pin format
makernode.my_pin_format = function(server_pins, server_connections) {
    var pins = {};

    _.each(server_pins, function(pin, id) {
        var name = id;
        if (pin.is_analog && !pin.is_input)   // analog out:
            name = '~' + id;                  // ex. '~3'
        if (pin.is_analog && pin.is_input)    // analog in:
            name = 'A' + (parseInt(id) - 14); // 14 = A0, 15 = A1, etc

        var type = '';
        if ( pin.is_analog &&  pin.is_input) type = 'Analog Input';
        if ( pin.is_analog && !pin.is_input) type = 'PWM Output';
        if (!pin.is_analog &&  pin.is_input) type = 'Digital Input';
        if (!pin.is_analog && !pin.is_input) type = 'Digital Output';

        pins[id] = {
            id: id,
            name: name,
            type: type,
            label: pin.label,
            value: pin.value * 100,
            is_visible: pin.is_visible,
            is_analog: pin.is_analog,
            is_input: pin.is_input,
            input_min: Math.round(pin.input_min * 100),
            input_max: Math.round(pin.input_max * 100),
            damping: pin.damping,
            is_inverted: pin.is_inverted,
            is_timer_on: pin.is_timer_on,
            timer_value: pin.timer_value,
        };
    });

    _.each(server_connections, function(c) {
        pins[c.source].is_connected = true;
        pins[c.target].is_connected = true;
    });

    return pins;
};

// translate my pin format into the server's format
makernode.server_pin_format = function(my_pins, my_pin_ids) {
    var pins = {};

    _.each(my_pin_ids, function(id) {
        var pin = my_pins[id];
        pins[id] = {
            label: pin.label,
            value: pin.value / 100,
            is_visible: pin.is_visible,
            is_analog: pin.is_analog,
            is_input: pin.is_input,
            input_min: parseInt(pin.input_min) / 100,
            input_max: parseInt(pin.input_max) / 100,
            damping: parseInt(pin.damping),
            is_inverted: pin.is_inverted,
            is_timer_on: pin.is_timer_on,
            timer_value: pin.timer_value,
        };
    });

    return pins;
};

// URL SETTINGS

makernode.rc = function routing_control() {

    var that = {};

    var url_root = null; // ex. http://www.makernode.com/, http://172.20.10.8
    var server_hash = null; // ex. confirm_network, ''

    that.reset = function(s) {
        url_root = s.url_root;
        server_hash = s.hash_code;
    };

    that.get_route_key = function(val, attr) {
        var route_key;
        _.each(makernode.routes, function(o, key) {
            if (o[attr] === val) {
                route_key = key;
            }
        });
        return route_key;
    };
    that.currentRouteKey = function() {
        return makernode.get_route_key(window.location.hash.substring(2), 'hash');
    };

    that.goTo = function(route) {
        window.location.hash = '#/' + route.hash;
    };
    that.goBack = function(n) {
        window.history.go(-n);
    };

    that.update = function(s) {
        if (s.url_root !== url_root) {
            url_root = s.url_root;
            that.goTo(makernode.routes.connecting);
            that.connect();
        }
        if (window.location.origin === url_root &&
            that.currentRouteKey() === 'connecting') {
            that.goTo(makernode.routes.control_mode);
        }
        if (s.hash_code.length > 0 && s.hash_code !== server_hash) {
            that.goTo(makernode.routes[makenode.get_route_key(server_hash, 'hash')]);
        }
    };

    that.connect = function(onerror, hash) {
        var ws_url = 'ws://' + url_root + ':8001';
        console.log('To test whether Galileo has gotten onto the wifi network yet, we are trying to connect to the Galileo websocket at ', ws_url);

        var keep_trying = true;
        // Yes, we are pessimists. Expect failure and prepare the error msg.
        setTimeout(function() {
            console.log('Connecting to the Galileo websocket at', ws_url, 'failed');
            keep_trying = false;
            onerror();
        }, 5 * 60 * 1000); // five minutes

        function try_websocket_connection() {
            if (keep_trying) {
                console.log('Attempting to establish a websockets connection with Galileo at', ws_url);
                var ws = new WebSocket(ws_url);
                ws.onmessage = function(msg) {
                    var d = JSON.parse(msg.data);
                    if (_.has(d, 'pins') && _.has(d, 'connections')) {
                        window.location.href = url_root;
                    }
                };
                setTimeout(try_websocket_connection, 1000);
            }
        };
        try_websocket_connection();
    };

    return that;
}();

