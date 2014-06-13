var makernode = {};

makernode.websocket_url = 'ws://localhost:8001'; // test-server.js

makernode.app = angular.module('MakerNode', ['ngRoute']);

makernode.routes = {
    init: {
        hash: '',
        server_code: null,
        controller: 'InitCtrl',
        template: 'empty',
    },
    confirm_mac: {
        hash: 'confirm_mac_address',
        server_code: 'confirm_mac_address',
        controller: 'FormCtrl',
        template: 'confirm_mac',
    },
    wifi_setup: {
        hash: 'wifi_router_setup',
        server_code: 'wifi_router_setup',
        controller: 'FormCtrl',
        template: 'wifi_setup',
    },
    create_user: {
        hash: 'create_user',
        server_code: 'create_user',
        controller: 'FormCtrl',
        template: 'create_user',
    },
    app_home: {
        hash: 'home',
        server_code: 'home',
        controller: 'HomeCtrl',
        template: 'home',
    },
};

makernode.get_route_key = function(val, attr) {
    // example: val 'confirm_mac_address' with attr 'server_code' returns 'confirm_mac'
    var route_key = 'init';
    _.each(makernode.routes, function(o, key) {
        if (o[attr] === val) {
            route_key = key;
        }
    });
    return route_key;
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

    $scope.routes = makernode.routes;
    $scope.parseInt = parseInt;

    $scope.d = makernode.d();
    $scope.s = {
        got_data: false,
        route_key: 'init',
    };

    $scope.currentRouteKey = function() {
        return makernode.get_route_key(window.location.hash.substring(1), 'hash');
    };
    $scope.goTo = function(route) {
        window.location.hash = '#/' + route.hash;
    };
    $scope.goBack = function(n) {
        window.history.go(-n);
    };

    // set up connection with server
    Galileo.set_all_pins_getter(function() {
        return $scope.d.pins;
    });
    Galileo.on('websocket-opened', function() {
        console.log('WEBSOCKET OPENED');
    });
    Galileo.on('update', function(data) {
        if (!$scope.s.got_data) { // first time initialization
            $scope.s.got_data = true;
            $scope.d.reset(data);
        } else {
            $scope.s.got_data = true;
            $scope.d.update(data);
        }
        var server_route_key = makernode.get_route_key(data.route_server_code, 'server_code');
        if (server_route_key !== $scope.currentRouteKey()) {
            $scope.goTo(makernode.routes[server_route_key]);
        }
    });
    Galileo.on('slowness', function() {
        $scope.s.got_data = false;
    });
    Galileo.on('websocket-closed', function() {
        $scope.s.got_data = false;
    });
    Galileo.connect('ws://localhost:8001');
}]);

makernode.app.controller('InitCtrl', ['$scope', function($scope) {
    //$scope.goTo($scope.routes.confirm_mac);
}]);

makernode.app.controller('FormCtrl', ['$scope', function($scope) {
    $scope.form = {};
}]);

makernode.app.controller('HomeCtrl', ['$scope', function($scope) {

}]);

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
            ssid: batch.ssid,
            pins: cat.server_pin_format(get_all_pins(), _.keys(batch.pins)),
            connections: batch.connections,
            message_id: message_id,
        };
        ws.send(JSON.stringify(msg_for_server));
        batch = null;
    };

    var send = _.throttle(_send, update_period);

    var add_to_batch = function(updates) {
        batch = _.extend({ pins: {}, connections: [] }, batch);
        _.each(updates.pins, function(pin, id) {
            batch.pins[id] = _.extend({}, batch.pins[id], pin);
        });
        // TODO remove redundant add/remove connection updates before sending out batch
        batch.connections.push.apply(batch.connections, updates.connections);
        if (_.has(updates, 'ssid')) {
            batch.ssid = updates.ssid;
        }
        send();
    };

    var update_ssid = function(ssid) {
        add_to_batch({ssid: ssid});
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

        // TODO put these back in for deployment
        console.log('websocket message', server_msg);
        var data = JSON.parse(server_msg.data);
        console.log('websocket data', data);
        console.log('\tdata.message_ids_processed', JSON.stringify(data.message_ids_processed));

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
        var ssid = data.ssid;
        var route_server_code = data.step;

        function update(d) {
            _.each(d.pins, function(pin_updates, pin_id) {
                pins[pin_id] = _.extend(pins[pin_id], pin_updates);
            });
            _.each(d.connections, function(c) {
                conns[makernode.tokenize_connection_object(c)] = c.connect;
            });
            if (_.has(d, 'ssid'))
                ssid = d.ssid;
        }

        var messages_in_order = _.sortBy(_.values(messages), function(msg) {
            return msg.time;
        });
        _.each(messages_in_order, function(msg) {
            console.log('updating server data with message_id', msg.message_id, 'update', msg.stringified_updates);
            update(JSON.parse(msg.stringified_updates));
        });
        if (batch !== null) {
            update(batch);
        }

        var connections = [];
        _.each(conns, function(val, token) {
            if (val)
                connections.push(makernode.detokenize_connection(token));
        });

        do_callback('update', {
            pins: pins,
            connections: connections,
            ssid: ssid,
            route_server_code: route_server_code,
        });

        console.log('\n\n');
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
        update_ssid: update_ssid,
        set_all_pins_getter: set_all_pins_getter,
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
