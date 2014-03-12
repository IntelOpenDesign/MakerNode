// Contain everything within the cat object
var cat = {};

// server connection settings
cat.on_hardware = false; // to switch to Galileo, just change this to true
cat.test_server_url = 'ws://localhost:8001';
cat.hardware_server_url = 'ws://cat/';
cat.hardware_server_protocol = 'hardware-state-protocol';

// connections can only draw themselves once jsPlumb is ready
cat.jsplumb_ready = false;

jsPlumb.bind('ready', function() {
    jsPlumb.Defaults.Container = $('body');
    cat.jsplumb_ready = true;
    // TODO I think nobody listens to this event anymore so remove it
    $(document).trigger('jsplumb-ready');
});

// TODO remove when done debugging
function toggle_debug_log() {
    $('#debug-log').toggleClass('hide');
}

// cat.app is the angular app
cat.app = angular.module('ConnectAnything', []);

// used by ng-repeat to draw only the visible sensors
cat.app.filter('sensors', function() {
    return function(pins) {
        return _.filter(pins, function(pin) {
            return pin.is_input && pin.is_visible;
        });
    }
});
// used by ng-repeat to draw only the visible actuators
cat.app.filter('actuators', function() {
    return function(pins) {
        return  _.filter(pins, function(pin) {
            return !pin.is_input && pin.is_visible;
        });
    }
});

// The controller for the whole app. Also handles talking to the server.
// TODO refactor and make server code separated and more robust
cat.app.controller('PinsCtrl', ['$scope', 'Galileo', function($scope, Galileo) {

    var $document = $(document);

    // TODO take this out when done debugging
    window.$scope = $scope;

    // whether we have yet received any data from the server
    $scope.got_data = false;

    // pins and connections are the primary state of the app. it determines the
    // hardware's behavior. we sync this with the server because other users
    // are updating this on their screens too.
    $scope.pins = {};
    $scope.connections = [];

    // TALKING WITH GALILEO

    Galileo.on('update', function(d) {
        if (!$scope.got_data) { // first time initialization
            $scope.got_data = true;
            $scope.pins = d.pins;
            cat.clear_all_connections();
            $scope.connections = d.connections;
         } else { // after that just update changes
            $scope.got_data = true;

            // update pins
            _.each(d.pins, function(pin, id) {
                _.each(pin, function(val, attr) {
                    $scope.pins[id][attr] = val;
                });
            });

            // update connections
            var my_tokens = _.map($scope.connections, cat.tokenize_connection);
            var new_tokens = _.map(d.connections, cat.tokenize_connection);
            var tokens_to_remove = _.difference(my_tokens, new_tokens);
            var tokens_to_add = _.difference(new_tokens, my_tokens);
            var connections_to_remove = _.map(tokens_to_remove, cat.detokenize_connection);
            var connections_to_add = _.map(tokens_to_add, cat.detokenize_connection);
            disconnect_on_client(connections_to_remove);
            connect_on_client(connections_to_add);
         }
    });

    Galileo.on('slowness', function() {
        $scope.got_data = false;
    });

    Galileo.on('websocket-closed', function() {
        $scope.got_data = false;
    });

    $scope.send_pin_update = function(pin_ids) {
        Galileo.update_pins($scope.pins, pin_ids);
    };

    Galileo.connect(cat.test_server_url);

    // HOW THE APP ADDS/REMOVES CONNECTIONS
    // updating $scope.connections and $scope.pins[<id>].is_connected

    var connect_on_client = function(connections) {
        $scope.connections.push.apply($scope.connections, connections);
        _.each(connections, function(c) {
            $scope.pins[c.source].is_connected = true;
            $scope.pins[c.target].is_connected = true;
        });
    };

    var disconnect_on_client = function(connections) {
        var delc = cat.connections_dict(connections); // connections to delete
        var indices = [];
        _.each($scope.connections, function(c, i) {
            if (delc[c.source] && delc[c.source][c.target]) {
                cat.clear_connection(c.source, c.target);
                indices.push(i);
            }
        });
        indices.sort(function(x, y) { return y - x; }); // descending order
        _.each(indices, function(index) {
            $scope.connections.splice(index, 1);
        });

        var allc = cat.connections_dict($scope.connections); // remaining conns
        _.each($scope.pins, function(pin, id) {
            if (allc[id] === undefined) {
                $scope.pins[id].is_connected = false;
            }
        });
    };

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
        var existing_connection = _.filter($scope.connections, function(c) {
            return c.source === sensor && c.target === actuator;
        });
        var connections = [{source: sensor, target: actuator}];
        if (existing_connection.length === 0) {
            connect_on_client(connections);
            Galileo.add_connections(connections);
        } else {
            disconnect_on_client(connections);
            Galileo.remove_connections(connections);
        }
        $scope.activated_sensor = null;
    };

    // HOW THE USER ADJUSTS PIN SETTINGS
    // When the user taps a pin's box, we deactivate all pins and show the
    // settings for that pin.

    // TODO if you are in settings and you click outside of settings, it should close settings

    $scope.settings_pin = null;
    $scope.show_settings_for = function(pin) {
        $scope.activated_pin = null;
        $scope.settings_pin = pin;
    };

    $scope.close_settings = function() {
        $scope.settings_pin = null;
    };
}]);

// DRAWING PINS

cat.pin_base = function($scope, $el, attrs) {
    var that = {};
    return that;
};

cat.app.directive('sensor', function($document) {
    function link($scope, $el, attrs) {
        var that = cat.pin_base($scope, $el, attrs);
    }
    return { link: link };
});

cat.app.directive('actuator', function($document) {
    function link($scope, $el, attrs) {
        var that = cat.pin_base($scope, $el, attrs);

        $scope.already_connected_to_activated_sensor = function() {
            return _.filter($scope.connections, function(c) {
                return c.source === $scope.activated_sensor && c.target === attrs.id;
            }).length > 0;
        };
    }
    return { link: link };
});

// PIN SETTINGS
cat.pin_settings_base = function($scope, $el, attrs) {
    var that = {};
    that.$settings_label = $el.find('input.pin-label');

    $scope.update_pin_label = function() {
        $scope.pins[attrs.id].label = that.$settings_label.val();
        $scope.send_pin_update([attrs.id]);
    };

    return that;
};

cat.app.directive('sensorSettings', function($document) {
    function link($scope, $el, attrs) {
        var that = cat.pin_settings_base($scope, $el, attrs);

        $scope.average_min_max = function() {
            return (parseFloat($scope.pin.window_min) + parseFloat($scope.pin.window_max))/2;
        };
    }
    return { link: link };
});
// TODO actuator settings

// DRAWING CONNECTIONS
cat.app.directive('connection', function($document) {
    function link($scope, $el, attrs) {

        console.log('connection link', attrs.sensorId, '-', attrs.actuatorId);

        var $sensor, $actuator, connection, msg;
        $sensor = $actuator = connection = msg = null;

        // a connection can only draw itself after jsPlumb is ready and its
        // endpoints are drawn on the DOM. so, a connection keeps checking to
        // see if these things are ready, and once they are it renders itself
        function find_my_pins() {
            $sensor = $('#'+attrs.sensorId);
            $actuator = $('#'+attrs.actuatorId);
            if (!cat.jsplumb_ready || $sensor.length === 0 || $actuator.length === 0) {
                setTimeout(find_my_pins, 10);
            } else {
                render();
            }
        }

        function render() {
            connection = jsPlumb.connect({
                source: attrs.sensorId+'-endpoint',
                target: attrs.actuatorId+'-endpoint',
                connector: 'Straight',
                cssClass: 'connection pins-'+attrs.sensorId+'-'+attrs.actuatorId,
                endpoint: 'Blank',
                endpointClass: 'endpoint pins-'+attrs.sensorId+'-'+attrs.actuatorId,
                anchors: ['Center', 'Center'],
                paintStyle: {
                    lineWidth: 15,
                    strokeStyle: 'rgb(44, 38, 33)',
                    outlineWidth: 2,
                    outlineColor: 'white',
                },
                endpointStyle: {
                    fillStyle: '#a7b04b',
                },
                //hoverPaintStyle: {
                 //   strokeStyle: 'rgb(250, 250, 60)',
                //},
            });
        }

        find_my_pins();
    }

    return { link: link };
});

cat.clear_all_connections = function() {
    $('._jsPlumb_endpoint').remove();
    $('._jsPlumb_connector').remove();
};

cat.clear_connection = function(sensor, actuator) {
    console.log('clear connection', sensor, actuator);
    $('.connection.pins-'+sensor+'-'+actuator).remove();
};

// SERVER COMMUNICATION

cat.app.factory('Galileo', ['$rootScope', function($rootScope) {

    var name = 'Galileo'; // to match the module name, for logging purposes
    var ws;               // websocket
    var url, protocol;

    // TODO it's confusing that this one is called wait but start_waiting() and stop_waiting() use slowness_time
    var wait = 500; // wait this long between attempts to connect
    var slowness_time = 15000; // max acceptable wait time between server
                               // messages, in milliseconds.

    //TODO remove when done debugging
    var $debug_log = $('#debug-log');

    // for certain "events" you can assign exactly one callback function. they
    // are not real events; the strings just describe the situation in which
    // that callback function will be done
    var callbacks = {
        'websocket-opened': function() {}, // no args
        'update': function() {}, // gets one arg, the update data
        'slowness': function() {}, // no args
        'websocket-closed': function() {}, // no args
    };

    // assign callback functions
    var on = function(e, f) {
        if (!_.has(callbacks, e)) {
            throw name + ".on: " + e + " is not a valid callback type. You can assign exactly one callback for each of the types in " + JSON.stringify(_.keys(callbacks));
        } else {
            callbacks[e] = f;
        }
    };

    var do_callback = function(e, arg) {
        $rootScope.$apply(function() {
            callbacks[e](arg); // TODO how to handle multiple args
         });
    };

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
            console.log(name + ".connect failed with error", err, "Trying again in", wait, " ms...");
            setTimeout(function() {
                connect(url, protocol);
            }, wait);
        }
    };

    var onopen = function() {
        console.log(name, 'websocket opened');
        do_callback('websocket-opened');
    };

    var onclose = function() {
        // NOTE that if a "new WebSocket" call has valid parameters, but the
        // server is not running, that will trigger onclose and will not throw
        // an error
        stop_waiting();
        console.log(name, 'websocket closed, trying to reconnect in', wait, 'ms...');
        do_callback('websocket-closed');
        setTimeout(function() {
            connect(url, protocol);
        }, wait);
    };

    var onmessage = function(msg) {
        stop_waiting();

        console.log('websocket message', msg);
        var data = JSON.parse(msg.data);
        console.log('websocket data', data);

        //TODO remove when done debugging
        $debug_log.html(msg.data);

        var d = {
            pins: cat.my_pin_format(data.pins, data.connections),
            connections: data.connections,
        };

        do_callback('update', d);

        start_waiting();
    };

    // sending websocket messages
    var send = function(data) {
        ws.send(JSON.stringify(_.extend({status: 'OK'}, data)));
    };
    var update_pins = function(pins, pin_ids) {
        send({pins: cat.server_pin_format(pins, pin_ids)});
    };
    var add_connections = function(connections) {
        send({connections: connections});
    };
    var remove_connections = function(connections) {
        send({connections: connections});
    };

    // if there is a big lag time (>= slowness_time) between messages from the
    // server, we start to get suspicious that the server is malfunctioning,
    // and so we do the slowness callback
    var slowness_timeout_id = null;
    var start_waiting = function() {
        slowness_timeout_id = setTimeout(function() {
            console.log(name, 'is being too slow');
            do_callback('slowness');
        }, slowness_time);
    };
    var stop_waiting = function() {
        if(slowness_timeout_id !== null) {
            clearTimeout(slowness_timeout_id);
            slowness_timeout_id = null;
        }
    };

    return {
        on: on,
        connect: connect,
        update_pins: update_pins,
        add_connections: add_connections,
        remove_connections: remove_connections,
    };

}]);

// UTILITY FUNCTIONS

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
            window_min: pin.window_min.toString(),
            window_max: pin.window_max.toString(),
            damping: pin.damping.toString(),
            is_inverted: pin.is_inverted,
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
            window_min: parseFloat(pin.window_min),
            window_max: parseFloat(pin.window_max),
            damping: parseInt(pin.damping),
            is_inverted: pin.is_inverted,
        };
    });

    return pins;
};

// a dictionary representation of connections that makes it easy to check if a
// connection exists. for each connection in connections_list, the resulting
// dict will have
// d[source][target] = true
// and
// d[target][source] = true
cat.connections_dict = function(connections_list) {
    var d = {};
    _.each(connections_list, function(c) {
        _.each([[c.source, c.target], [c.target, c.source]], function(o) {
            if (d[o[0]] === undefined) {
                d[o[0]] = {};
            }
            d[o[0]][o[1]] = true;
        });
    });
    return d;
};

// represent connections as strings so they can easily be compared for equality
cat.tokenize_connection = function(c) {
    return c.source + '-' + c.target;
}
// translate back from string to connection object
cat.detokenize_connection = function(s) {
    var pins = s.split('-');
    return {source: pins[0], target: pins[1]};
}

// OTHER NOTES
// good resource: http://clintberry.com/2013/angular-js-websocket-service/
