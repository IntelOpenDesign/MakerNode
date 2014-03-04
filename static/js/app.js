// Contain everything within the cat object
var cat = {};

// the whole app needs to know when jsPlumb is ready because only then can we draw connections
cat.jsplumb_ready = false;

jsPlumb.bind('ready', function() {
    jsPlumb.Defaults.Container = $('#field');

    cat.jsplumb_ready = true;
    $(document).trigger('jsplumb-ready');

    // TODO this is for dragging/sorting possibility
    /* some combination of this might work -- laggy/buggy though
     * ALSO: how to do it on mobile?
    $('#sensors').sortable();
    $('#actuators').sortable();
    jsPlumb.draggable($('.sensor'), {containment: '#sensors'});
    jsPlumb.draggable($('.actuator'), {containment: '#actuators'});
    */
});

// TODO remove when done debugging
function toggle_debug_log() {
    $('#debug-log').toggleClass('hide');
}

// websocket server
cat.server_url = 'ws://localhost:8001';
// for Galileo
// cat.server_url = 'ws://cat/';

// parameterize events
cat.tap = 'mousedown';

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

    $scope.activated_sensor = null;
    $scope.settings_pin = null;
    $scope.settings_pin_label_focus = false;
    $scope.focus_label = function() {
        $scope.settings_pin_label_focus = true;
    };
    $scope.unfocus_label = function() {
        $scope.settings_pin_label_focus = false;
    };
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
        //TODO remove when done debugging
        $debug_log.html(msg.data);
        var data = JSON.parse(msg.data);
        console.log('websocket data', data);

        var new_pins = cat.my_pin_format(data.pins, data.connections);

        cat.clear_all_connections();
        $scope.$apply(function() {
            $scope.pins = new_pins;
            $scope.connections = data.connections;
        });
    };

    $scope.sync_pins = function() {
        ws.send(JSON.stringify({
            status: 'OK',
            pins: cat.server_pin_format($scope.pins),
        }));
    };

    var connect = function(sensor, actuator) {
        ws.send(JSON.stringify({
            status: 'OK',
            connections: [{source: sensor, target: actuator}],
        }));
        $scope.connections.push({
            source: sensor,
            target: actuator,
        });
        $scope.pins[sensor].is_connected = true;
        $scope.pins[actuator].is_connected = true;
    };

    var disconnect = function(sensor, actuator) {
        ws.send(JSON.stringify({
            status: 'OK',
            connections: [{source: sensor, target: actuator}],
        }));
        $scope.connections = _.filter($scope.connections, function(c) {
            return !(c.source === sensor && c.target === actuator);
        });
        cat.clear_connection(sensor, actuator);
    };

    $scope.toggle_activated = function(sensor) {
        $scope.$apply(function() {
            if ($scope.activated_sensor === sensor) {
                $scope.activated_sensor = null;
            } else {
                $scope.activated_sensor = sensor;
            }
        });
    };

    $scope.connect_or_disconnect = function(actuator) {
        $scope.$apply(function() {
            if ($scope.activated_sensor === null) {
                return;
            }
            var sensor = $scope.activated_sensor;
            var existing_connection = _.filter($scope.connections, function(c) {
                return c.source === sensor && c.target === actuator;
            });
            if (existing_connection.length === 0) {
                connect(sensor, actuator);
            } else {
                var msg = 'Do you want to delete the ' + $scope.pins[sensor].name + ' - ' + $scope.pins[actuator].name + ' connection?';
                if (confirm(msg)) {
                    disconnect(sensor, actuator);
                }
            }
            $scope.activated_sensor = null;
        });
    };

    $scope.show_settings_for = function(pin) {
        $scope.$apply(function() {
            $scope.activated_pin = null;
            $scope.settings_pin = pin;
        });
    };

    $scope.close_settings = function() {
        $scope.settings_pin = null;
    };
}]);

// sensor and actuator directives both inherit from cat.pin_base
cat.pin_base = function(click_callback_maker) {

    return function($scope, $el, attrs) {
        var $endpoint = $el.find('.endpoint');
        var $box = $el.find('.pin-box');
        var $settings_label = $el.find('input.pin-label');

        // TODO preserve the cursor position within the input somehow?
        if ($scope.settings_pin_label_focus &&
            $scope.settings_pin === attrs.id) {
            setTimeout(function() {
                $settings_label.focus();
            }, 0);
        }

        $endpoint.on(cat.tap, click_callback_maker($scope, $el, attrs));
        $box.on(cat.tap, function(e) {
            $scope.show_settings_for(attrs.id);

        });

        $el.on('$destroy', function() {
            $endpoint.off(cat.tap);
            $box.off(cat.tap);
        });

    }
};

cat.app.directive('sensor', function($document) {
// TODO can I just do this with ng-click?
    var sensor_callback_maker = function($scope, $el, attrs) {
        return function(e) {
            $scope.toggle_activated(attrs.id);
        }
    };

    return {link: cat.pin_base(sensor_callback_maker)};
});

cat.app.directive('actuator', function($document) {

    var actuator_callback_maker = function($scope, $el, attrs) {
        return function(e) {
            $scope.connect_or_disconnect(attrs.id);
        }
    };

    return {link: cat.pin_base(actuator_callback_maker)};
});

cat.app.directive('connection', function($document) {
    function link($scope, $el, attrs) {

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
                source: attrs.sensorId,
                target: attrs.actuatorId,
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

cat.server_pin_format = function(my_pins) {
    var pins = {};

    _.each(my_pins, function(pin, id) {
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
