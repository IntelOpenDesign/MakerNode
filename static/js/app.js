// Contain everything within the cat object
var cat = {};

// server connection settings
cat.on_hardware = false; // to switch to Galileo, just change this to true
cat.test_server_url = 'ws://192.168.0.195:8001';
cat.hardware_server_url = 'ws://cat/';
cat.hardware_server_protocol = 'hardware-state-protocol';

// TODO remove when done debugging
function toggle_debug_log() {
    $('#debug-log').toggleClass('hide');
}

// PINS AND CONNECTIONS DATA STRUCTURE
cat.d = function() {
    var that = {};
    // pins and connections are the primary app state
    that.pins = {};
    that.connections = [];
    // these are convenient for templates, and are kept in sync with pins
    that.visible_sensors = [];
    that.visible_actuators = [];
    that.hidden_sensors = [];
    that.hidden_actuators = [];

    var sync_pin_lists = function() {
        var vissen = [], visact = [], hidsen = [], hidact = [];
        _.each(that.pins, function(pin, id) {
            if (pin.is_visible) {
                if (pin.is_input) vissen.push(pin);
                else              visact.push(pin);
            } else {
                if (pin.is_input) hidsen.push(pin);
                else              hidact.push(pin);
            }
        });
        that.visible_sensors = vissen;
        that.visible_actuators = visact;
        that.hidden_sensors = hidsen;
        that.hidden_actuators = hidact;
    };

    var sync_pin_connectedness = function() {
        _.each(that.pins, function(pin) {
            pin.is_connected = false;
        });
        _.each(that.connections, function(c) {
            that.pins[c.source].is_connected = true;
            that.pins[c.target].is_connected = true;
        });
    };

    that.reset = function(data) {
        that.pins = data.pins;
        that.connections = data.connections;
        sync_pin_lists();
    };

    that.update = function(data) {
        _.each(data.pins, function(pin, id) {
            _.each(pin, function(val, attr) {
                that.pins[id][attr] = val;
            });
        });

        var my_tokens = _.map(that.connections, cat.tokenize_connection_object);
        var new_tokens = _.map(data.connections, cat.tokenize_connection_object);
        var tokens_to_remove = _.difference(my_tokens, new_tokens);
        var tokens_to_add = _.difference(new_tokens, my_tokens);
        var conns_to_remove = _.map(tokens_to_remove, cat.detokenize_connection);
        var conns_to_add = _.map(tokens_to_add, cat.detokenize_connection);

        that.disconnect(conns_to_remove);
        that.connect(conns_to_add);

        sync_pin_lists();
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
        sync_pin_connectedness();
    };

    that.connect = function(connections) {
        that.connections.push.apply(that.connections, connections);
        sync_pin_connectedness();
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
        sync_pin_lists();
    };

    that.hide_pins = function(ids) {
        var conns_to_remove = [];
        _.each(ids, function(id) {
            that.pins[id].is_visible = false;
            var end = that.pins[id].is_input ? 'source' : 'target';
            var more_to_remove = _.filter(that.connections, function(c) {
                return c[end] === id;
            });
            conns_to_remove.push.apply(conns_to_remove, more_to_remove);
        });

        sync_pin_lists();
        that.disconnect(conns_to_remove);
        return conns_to_remove;
    };

    return that;
};

// cat.app is the angular app
cat.app = angular.module('ConnectAnything', []);

// The controller for the whole app. Also handles talking to the server.
cat.app.controller('PinsCtrl', ['$scope', 'Galileo', function($scope, Galileo) {

    var $document = $(document);

    // TODO take this out when done debugging
    window.$scope = $scope;

    // whether we have yet received any data from the server
    $scope.got_data = false;

    // pins and connections
    $scope.d = cat.d();

    // TALKING WITH GALILEO

    Galileo.set_all_pins_getter(function() {
        return $scope.d.pins;
    });

    Galileo.on('update', function(data) {
        if (!$scope.got_data) { // first time initialization
            $scope.got_data = true;
            $scope.d.reset(data);
         } else { // after that just update changes
            $scope.got_data = true;
            $scope.d.update(data);
        }
    });

    Galileo.on('slowness', function() {
        $scope.got_data = false;
    });

    Galileo.on('websocket-closed', function() {
        $scope.got_data = false;
    });

    $scope.send_pin_update = function(pin_ids, attr) {
        Galileo.update_pins(pin_ids, attr);
    };

    if (cat.on_hardware) {
        Galileo.connect(cat.hardware_server_url, cat.hardware_server_protocol);
    } else {
        Galileo.connect(cat.test_server_url);
    }

    // HOW THE USER ADDS/REMOVES CONNECTIONS
    // When the user taps a sensor's endpoint, we activate that sensor,
    // deactivate all other sensors, and activate all actuators. Then if the
    // user taps an actuator's endpoint, we either form a new connection
    // between the activated sensor and the tapped actuator, or delete that
    // connection if it already existed. If the user taps the endpoint of the
    // sensor that was already activated, then we deactivate that sensor and go
    // back to having no activated pins.

    $scope.activated_sensor = null;

    // triggered when the user taps a sensor
    $scope.toggle_activated = function($event, sensor) {
        $event.stopPropagation();
        if ($scope.activated_sensor === sensor) {
            $scope.activated_sensor = null;
        } else {
            $scope.activated_sensor = sensor;
        }
    };

    // triggered when the user taps an actuator
    $scope.connect_or_disconnect = function($event, actuator) {
        $event.stopPropagation();
        if ($scope.activated_sensor === null) {
            return;
        }
        var sensor = $scope.activated_sensor;
        var connections = [{source: sensor, target: actuator}];
        if ($scope.d.are_connected(sensor, actuator)) {
            $scope.d.disconnect(connections);
            Galileo.remove_connections(connections);
        } else {
            $scope.d.connect(connections);
            Galileo.add_connections(connections);
        }
        $scope.activated_sensor = null;
    };

    // HOW THE USER ADJUSTS PIN SETTINGS
    // When the user taps a pin's box, we deactivate all pins and show the
    // settings for that pin. Hitting the OK button in the settings window or
    // hitting the back button in the browser will exit out of pin settings.

    $scope.settings_pin = null;
    $scope.show_settings_for = function(pin) {
        $scope.activated_pin = null;
        $scope.settings_pin = pin;
        window.history.pushState();
        window.onpopstate = function() {
            $scope.close_settings(true);
        };
    };

    $scope.close_settings = function(history_state_already_popped) {
        // TODO make sure this does not accumulate history states so that the user would have to hit back many times to exit the whole CAT website
        $scope.settings_pin = null;
        if (!history_state_already_popped) {
            window.history.back();
        }
    };

    // HOW THE USER SHOWS/HIDES PINS
    // Tapping a "+" button at the bottom of the screen opens or closes the add
    // pins menu. In this menu, tapping a pin selects it. Leaving the menu adds
    // the selected pins.
    // In the settings window for each pin, tapping "Remove" removes that pin
    // and all its connections, after asking the user for confirmation.

    $scope.adding_pins = null; // 'sensors' or 'actuators'
    $scope.show_remove_confirmation = false;
    $scope.pins_to_show = {};
    $scope.toggle_add_pins_menu_for = function(type) {
        if ($scope.adding_pins === type) {
            $scope.show_pins(_.keys($scope.pins_to_show));
            $scope.pins_to_show = {};
            $scope.adding_pins = null;
        } else {
            $scope.adding_pins = type;
        }
    };
    $scope.toggle_pin_show = function(id) {
        if ($scope.pins_to_show[id])
            delete $scope.pins_to_show[id];
        else
            $scope.pins_to_show[id] = true;
    };
    $scope.show_pins = function(ids) {
        $scope.d.show_pins(ids);
        $scope.send_pin_update(ids, 'is_visible');
    };
    $scope.hide_pins = function(ids) {
        var connections_to_remove = $scope.d.hide_pins(ids);
        $scope.send_pin_update(ids, 'is_visible');
        Galileo.remove_connections(connections_to_remove);
    };
}]);

// DRAWING PINS

cat.pin_template = 'templates/pin.html';

cat.app.directive('sensor', function($document) {
    function link($scope, $el, attrs) {
    }
    return { templateUrl: cat.pin_template, link: link };
});

cat.app.directive('actuator', function($document) {
    function link($scope, $el, attrs) {
        $scope.already_connected_to_activated_sensor = function() {
            if ($scope.activated_sensor === null) return false;
            return $scope.d.are_connected($scope.activated_sensor, $scope.pin.id);
        };
    }
    return { templateUrl: cat.pin_template, link: link };
});

cat.app.directive('pinStub', function($document) {
    return { templateUrl: 'templates/pin_stub.html' };
});

// PIN SETTINGS
cat.app.directive('pinSettings', function($document) {
    function link($scope, $el, attrs) {
        var $pin_label = $el.find('input.pin-label');
        $scope.label_limit_length = 20;
        $scope.pin_label = $scope.pin.label.substring();
        $scope.truncate_label = function() {
            if ($scope.pin_label.length > $scope.label_limit_length) {
                $scope.pin_label = $scope.pin_label.substring(0, $scope.label_limit_length);
            }
        };
        $scope.update_pin_label = function() {
            $scope.truncate_label();
            $scope.pin.label = $scope.pin_label.substring();
            $scope.send_pin_update([$scope.pin.id], 'label');
        };

        var $min = $('.vertical-slider.min');
        var $max = $('.vertical-slider.max');
        $scope.average_min_max = function() {
            return (parseFloat($scope.pin.input_min) + parseFloat($scope.pin.input_max))/2;
        };
        $scope.sync_min_max = function() {
            var min = $scope.pin.input_min;
            var max = $scope.pin.input_max;
            $scope.pin.input_max = Math.max(min, max);
            $scope.pin.input_min = Math.min(min, max);
            $scope.send_pin_update([$scope.pin.id], 'input_min');
            $scope.send_pin_update([$scope.pin.id], 'input_max');
        };
    }
    return { templateUrl: 'templates/pin_settings.html', link: link };
});

// DRAWING CONNECTIONS
cat.app.directive('connection', function($document) {
    function link($scope, $el, attrs) {

        var stroke_w = 15;
        var bg_stroke_w = stroke_w + 4; // background/outline

        var $start, $end;
        $start = $end = null;

        var line = d3.svg.line()
                    .x(function(d) { return d.x; })
                    .y(function(d) { return d.y; })
                    .interpolate('linear');

        // can only draw connection after its endpoints (pins) are drawn
        function find_my_pins() {
            $start = $('#' + attrs.sensorId + ' .endpoint');
            $end = $('#' + attrs.actuatorId + ' .endpoint');
            if ($start.length === 0 || $end.length === 0) {
                setTimeout(find_my_pins, 10);
            } else {
                render();
            }
        }

        function render() {
            var start_pos = $start.offset();
            var end_pos = $end.offset();

            var $left = start_pos.left < end_pos.left ? $start : $end;
            var $right = start_pos.left < end_pos.left ? $end : $start;
            var $top = start_pos.top < end_pos.top ? $start : $end;
            var $bottom = start_pos.top < end_pos.top ? $end : $start;

            var xmin = Math.min(start_pos.left, end_pos.left);
            var xmax = Math.max(start_pos.left, end_pos.left);
            var ymin = Math.min(start_pos.top, end_pos.top);
            var ymax = Math.max(start_pos.top, end_pos.top);

            var padding = bg_stroke_w / 2;

            var left   = xmin + $left.width()/2    - padding;
            var right  = xmax + $right.width()/2   + padding;
            var top    = ymin + $top.height()/2    - padding;
            var bottom = ymax + $bottom.height()/2 + padding;

            var w = right - left;
            var h = bottom - top;

            var points = [{x:0, y:0}, {x:0, y:0}];
            points[0].x = start_pos.left < end_pos.left ? padding : w - padding;
            points[1].x = start_pos.left < end_pos.left ? w - padding : padding;
            points[0].y = start_pos.top < end_pos.top ? padding : h - padding;
            points[1].y = start_pos.top < end_pos.top ? h - padding : padding;


            var selector = '#connect-' + attrs.sensorId + '-' + attrs.actuatorId + ' svg';
            setTimeout(function() {
                var svg = d3.select(selector)
                    .attr('width', w)
                    .attr('height', h)
                    .style('left', left + 'px')
                    .style('top', top + 'px');
                svg.select('path.edge-bg')
                    .attr('stroke-width', bg_stroke_w);
                svg.select('path.edge')
                    .attr('stroke-width', stroke_w);
                svg.selectAll('path')
                    .attr('d', line(points));
            }, 0);

            assign_watches();
        }

        var rerender = _.throttle(render, 50, {leading: false});

        // if the endpoints change size or position, need to re-render
        function watch_callback(newval, oldval) {
            if (newval !== oldval)
                rerender();
        }
        var assign_watches = _.once(function() {
            _.each([$start, $end], function($endpoint) {
                $scope.$watch(function() {
                    return $endpoint.offset().left + $endpoint.width()/2;
                }, watch_callback);
                $scope.$watch(function() {
                    return $endpoint.offset().top + $endpoint.height()/2;
                }, watch_callback);
            });
        });

        find_my_pins();

    }

    return { link: link };
});

// SERVER COMMUNICATION

cat.app.factory('Galileo', ['$rootScope', function($rootScope) {

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



    //TODO remove when done debugging
    var $debug_log = $('#debug-log');


    // Sending Updates to Server
    var messages = {}; // messages client side has sent to server
    var batch = null;  // the next batch of updates we will send to server
    var client_id = Date.now().toString();

    var _send = function() {
        var now = Date.now();
        var message_id = client_id + now;
        messages[message_id] = {
            time: now,
            message_id: message_id,
            updates: batch,
        };
        var msg_for_server = {
            status: 'OK',
            pins: cat.server_pin_format(get_all_pins(), _.keys(batch.pins)),
            connections: batch.connections,
        };
        batch = null;
        ws.send(JSON.stringify(msg_for_server));
    };

    var send = _.throttle(_send, update_period);

    var add_to_batch = function(updates) {
        batch = _.extend({ pins: {}, connections: [] }, batch);
        _.each(updates.pins, function(pin, id) {
            batch.pins[id] = _.extend({}, batch.pins[id], pin);
        });
        batch.connections.push.apply(batch.connections, updates.connections);
        send();
    };

    var update_pins = function(ids, attr) {
        var all_pins = get_all_pins();
        var updates = { pins: {}, connections: [] };
        _.each(ids, function(id) {
            updates.pins[id] = {};
            updates.pins[id][attr] = all_pins[id][attr];
        });
        add_to_batch(updates);
    };

    var update_connections = function(connections, bool) {
        var updates = { pins: {}, connections: [] };
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

        console.log('websocket message', server_msg);
        var data = JSON.parse(server_msg.data);
        console.log('websocket data', data);

        //TODO remove when done debugging
        $debug_log.html(server_msg.data);

        // we can forget about the messages the server has already processed
        _.each(data.message_ids, function(message_id) {
            delete messages[message_id];
        });

        // the remaining messages are ones that the server has not processed
        // yet. so, the data from the server is slightly out of date. so, we
        // take the data from the server, update it using our remaining
        // messages' updates, and then send that to the controller

        var pins = cat.my_pin_format(data.pins, data.connections);
        var conns = _.object(_.map(data.connections, function(c) {
            return [cat.tokenize_connection_object(c), true];
        }));

        var messages_in_order = _.sortBy(_.values(messages), function(msg) {
            return msg.time;
        });
        _.each(messages_in_order, function(msg) {
            _.each(msg.updates.pins, function(pin_updates, pin_id) {
                pins[pin_id] = _.extend(pins[pin_id], pin_updates);
            });
            _.each(msg.updates.connections, function(c) {
                conns[cat.tokenize_connection_object(c)] = c.connect;
            });
        });

        var connections = [];
        _.each(conns, function(val, token) {
            if (val)
                connections.push(cat.detokenize_connection(token));
        });

        do_callback('update', {pins: pins, connections: connections});

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
    };

}]);

// UTILITY FUNCTIONS

// tokenize connections
cat.tokenize_connection_pins = function(sensor, actuator) {
    return sensor + '-' + actuator;
};
cat.tokenize_connection_object = function(c) {
    return cat.tokenize_connection_pins(c.source, c.target);
};
cat.detokenize_connection = function(s) {
    var pins = s.split('-');
    return {source: pins[0], target: pins[1]};
};

// translate the server's pin format into my pin format
cat.my_pin_format = function(server_pins, server_connections) {
    var pins = {};

    _.each(server_pins, function(pin, id) {
        var name = id;
        if (pin.is_analog && !pin.is_input)   // analog out:
            name = '~' + id;                  // ex. '~3'
        if (pin.is_analog && pin.is_input)    // analog in:
            name = 'A' + (parseInt(id) - 14); // 14 = A0, 15 = A1, etc

        var type = '';
        if (pin.is_analog) {
            type = 'Analog';
        } else {
            type = 'Digital';
        }

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
cat.server_pin_format = function(my_pins, my_pin_ids) {
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

// OTHER NOTES
// good resource: http://clintberry.com/2013/angular-js-websocket-service/
