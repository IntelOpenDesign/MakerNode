// Contain everything within the cat object
var cat = {};

// the whole app needs to know when jsPlumb is ready because only then can we draw connections
cat.jsplumb_ready = false;

jsPlumb.bind('ready', function() {
    jsPlumb.Defaults.Container = $('#field');

    cat.jsplumb_ready = true;
    $(document).trigger('jsplumb-ready');
});

// TODO remove when done debugging
function toggle_debug_log() {
    $('#debug-log').toggleClass('hide');
}

// websocket server
cat.server_url = 'ws://192.168.0.199:8001';
// for Galileo
// cat.server_url = 'ws://cat/';

// cat.app is the angular app
cat.app = angular.module('ConnectAnything', []);

cat.app.filter('sensors', function() {
    return function(pins) {
        return _.filter(pins, function(pin) {
            return pin.is_input && pin.is_visible;
        });
    }
});
cat.app.filter('actuators', function() {
    return function(pins) {
        return  _.filter(pins, function(pin) {
            return !pin.is_input && pin.is_visible;
        });
    }
});

// The controller for the whole app. Also handles talking to the server.
// Eventually probably want to refactor
cat.app.controller('PinsCtrl', ['$scope', function($scope, server) {

    var $document = $(document);

    // TODO take this out when done debugging
    window.$scope = $scope;

    $scope.got_data = false;
    $scope.activated_sensor = null;
    $scope.settings_pin = null;
    $scope.pins = {};
    $scope.connections = [];

    // good resource: http://clintberry.com/2013/angular-js-websocket-service/
    var ws = new WebSocket(cat.server_url);
    // for Galileo
    //var ws = new WebSocket(cat.server_url, 'hardware-state-protocol');
    ws.onopen = function() {
        console.log('socket opened');
    };

    //TODO remove when done debugging
    var $debug_log = $('#debug-log');

    ws.onmessage = function(msg) {
        console.log('websocket message', msg);
        //TODO remove when done debugging
        $debug_log.html(msg.data);
        var data = JSON.parse(msg.data);
        console.log('websocket data parsed into JSON', data);

        var new_pins = cat.my_pin_format(data.pins, data.connections);

        if (!$scope.got_data) { // first time initialization
            $scope.$apply(function() {
                $scope.got_data = true;
                $scope.pins = new_pins;
                $scope.connections = data.connections;
            });
        } else { // after that just update the changes
            $scope.$apply(function() {
                // update pins
                $scope.got_data = true;
                _.each(new_pins, function(pin, id) {
                    _.each(pin, function(val, attr) {
                        $scope.pins[id][attr] = val;
                    });
                });

                // update connections
                function tokenize_connection(c) { // translate connections into strings so we can check equality
                    return c.source + '-' + c.target;
                }
                function detokenize_connection(s) { // translate back
                    var pins = s.split('-');
                    return {source: pins[0], target: pins[1]};
                }
                var my_tokens = _.map($scope.connections, tokenize_connection);
                var new_tokens = _.map(data.connections, tokenize_connection);
                var tokens_to_remove = _.difference(my_tokens, new_tokens);
                var tokens_to_add = _.difference(new_tokens, my_tokens);
                var connections_to_remove = _.map(tokens_to_remove, detokenize_connection);
                var connections_to_add = _.map(tokens_to_add, detokenize_connection);
                _.each(connections_to_remove, function(c) {
                    disconnect_on_client(c.source, c.target);
                });
                connect_on_client(connections_to_add);
            });
        }
    };

    $scope.send_pin_update = function(pin_ids) {
        ws.send(JSON.stringify({
            status: 'OK',
            pins: cat.server_pin_format($scope.pins, pin_ids),
        }));
    };

    var send_connect_to_server = function(sensor, actuator) {
        ws.send(JSON.stringify({
            status: 'OK',
            connections: [{source: sensor, target: actuator}],
        }));
    };

    var send_disconnect_to_server = function(sensor, actuator) {
        ws.send(JSON.stringify({
            status: 'OK',
            connections: [{source: sensor, target: actuator}],
        }));
    };

    var connect_on_client = function(connections) {
        $scope.connections.push.apply($scope.connections, connections);
        _.each(connections, function(c) {
            $scope.pins[c.source].is_connected = true;
            $scope.pins[c.target].is_connected = true;
        });
    };

    // make this take a list of connection objects
    var disconnect_on_client = function(sensor, actuator) {
        cat.clear_connection(sensor, actuator);
        $scope.connections = _.filter($scope.connections, function(c) {
            return !(c.source === sensor && c.target === actuator);
        });
        _.each([{pin: sensor, end: 'source'}, {pin: actuator, end: 'target'}], function(o) {
            var remaining_connections = _.filter($scope.connections, function(c) {
                return c[o.end] === o.pin;
            });
            if (remaining_connections.length === 0) {
                $scope.pins[o.pin].is_connected = false;
            }
        });
    };

    $scope.toggle_activated = function($event, sensor) {
        $event.stopPropagation();
        if ($scope.activated_sensor === sensor) {
            $scope.activated_sensor = null;
        } else {
            $scope.activated_sensor = sensor;
        }
    };

    $scope.connect_or_disconnect = function($event, actuator) {
        $event.stopPropagation();
        if ($scope.activated_sensor === null) {
            return;
        }
        var sensor = $scope.activated_sensor;
        var existing_connection = _.filter($scope.connections, function(c) {
            return c.source === sensor && c.target === actuator;
        });
        if (existing_connection.length === 0) {
            connect_on_client([{source:sensor, target:actuator}]);
            send_connect_to_server(sensor, actuator);
        } else {
            disconnect_on_client(sensor, actuator);
            send_disconnect_to_server(sensor, actuator);
        }
        $scope.activated_sensor = null;
    };

    $scope.show_settings_for = function(pin) {
        $scope.activated_pin = null;
        $scope.settings_pin = pin;
    };

    $scope.close_settings = function() {
        $scope.settings_pin = null;
    };
}]);

cat.pin_base = function($scope, $el, attrs) {
    var that = {};
    that.$settings_label = $el.find('input.pin-label');

    $scope.update_pin_label = function() {
        $scope.pins[attrs.id].label = that.$settings_label.val();
        $scope.send_pin_update([attrs.id]);
    };

    $scope.type = function() {
        var res = '';
        if ($scope.pins[attrs.id].is_analog) {
            res += 'Analog';
        } else {
            res += 'Digital';
        }
        return res;
    };

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

cat.app.directive('connection', function($document) {
    function link($scope, $el, attrs) {

        console.log('connection link', attrs.sensorId, '-', attrs.actuatorId);

        var $sensor, $actuator, connection, msg;
        $sensor = $actuator = connection = msg = null;

        function find_my_pins() {
            $sensor = $('#'+attrs.sensorId);
            $actuator = $('#'+attrs.actuatorId);
            if ($sensor.length === 0 || $actuator.length === 0) {
                setTimeout(find_my_pins, 10);
            } else {
                render();
            }
        }

        function render() {
            connection = jsPlumb.connect({
                source: attrs.sensorId+'-endpoint',
                target: attrs.actuatorId+'-endpoint',
                connector: ['Bezier', {curviness: 70}],
                cssClass: 'connection pins-'+attrs.sensorId+'-'+attrs.actuatorId,
                endpoint: 'Blank',
                endpointClass: 'endpoint pins-'+attrs.sensorId+'-'+attrs.actuatorId,
                anchors: ['Right', 'Left'],
                paintStyle: {
                    lineWidth: 15,
                    strokeStyle: 'rgb(232, 189, 0)',
                    outlineWidth: 2,
                    outlineColor: 'antiquewhite',
                },
                endpointStyle: {
                    fillStyle: '#a7b04b',
                },
                hoverPaintStyle: {
                    strokeStyle: 'rgb(250, 250, 60)',
                },
            });
        }

        find_my_pins();
    }

    return {
        link: link,
    };
});

cat.clear_all_connections = function() {
    $('._jsPlumb_endpoint').remove();
    $('._jsPlumb_connector').remove();
};

cat.clear_connection = function(sensor, actuator) {
    console.log('clear connection', sensor, actuator);
    $('.connection.pins-'+sensor+'-'+actuator).remove();
};

// translate between client side and server side format for pins
cat.my_pin_format = function(server_pins, server_connections) {
    var pins = {};

    _.each(server_pins, function(pin, id) {
        var name = id;
        if (pin.is_analog && !pin.is_input)   // analog out:
            name = '~' + id;                  // ex. '~3'
        if (pin.is_analog && pin.is_input)    // analog in:
            name = 'A' + (parseInt(id) - 14); // 14 = A0, 15 = A1, etc

        pins[id] = {
            id: id,
            name: name,
            label: pin.label,
            value: pin.value * 100,
            is_visible: pin.is_visible,
            is_analog: pin.is_analog,
            is_input: pin.is_input,
            sensitivity: pin.sensitivity.toString(),
            is_inverted: pin.is_inverted,
        };
    });

    _.each(server_connections, function(c) {
        pins[c.source].is_connected = true;
        pins[c.target].is_connected = true;
    });

    return pins;
};

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
            sensitivity: parseFloat(pin.sensitivity),
            is_inverted: pin.is_inverted,
        };
    });

    return pins;
};
