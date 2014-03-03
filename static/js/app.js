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

// Connections can only render AFTER BOTH jsPlumb is ready (because jsPlumb is
// what draws the svg edges and endpoints) AND their pins have rendered (so
// that the connection endpoints have real positions in the DOM). This function
// tracks those things. Connections call it to see if it is safe to render.
cat.is_safe_to_render_connections = function() {
    var $document = $(document);
    var visible_pins, rendered_pins;
    var all_pins_rendered = false;

    function check() {
        if (all_pins_rendered && cat.jsplumb_ready) {
            return true;
        } else {
            return false;
        }
    }

    function maybe_trigger() {
        if (check()) {
            $('.connection').trigger('render-connection');
        }
    }

    $document.on('reset-pins', function(e, pins) {
        visible_pins = [];
        _.each(pins, function(o, id) {
            if (o.is_visible) {
                visible_pins.push(id);
            }
        });
        rendered_pins = {};
        all_pins_rendered = false;
    });

    $document.on('rendered-pin', function(e, pin) {
        if (visible_pins.indexOf(pin) < 0) {
            console.log('this pin is weird:', pin);
            return;
        }
        rendered_pins[pin] = true;
        if (_.keys(rendered_pins).length === visible_pins.length) {
            all_pins_rendered = true;
            maybe_trigger();
        }
    });

    $document.on('jsplumb-ready', function(e) {
        maybe_trigger();
    });

    return check;
}();

// The controller for the whole app. Also handles talking to the server.
// Eventually probably want to refactor, but right now it's tight and simple.
cat.app.controller('PinsCtrl', ['$scope', function($scope, server) {

    var $document = $(document);

    // TODO take this out when done debugging
    window.$scope = $scope;

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

        var pins = {};
        _.each(data.pins, function(pin, id) {
            var name = id;
            if (pin.is_analog && !pin.is_input) // analog out
                name = '~' + id; // ex. '~3'
            if (pin.is_analog && pin.is_input) // analog in
                name = 'A' + (parseInt(id) - 14); // 14 = A0, 15 = A1, etc

            pins[id] = _.extend({
                id: id,
                name: name,
                is_connected: false,
            }, pin);
            pins[id].value *= 100;

            _.each(data.connections, function(c) {
                pins[c.source].is_connected = true;
                pins[c.target].is_connected = true;
            });
        });

        // you need to trigger this IFF you are causing pins to be redrawn
        $document.trigger('reset-pins', data.pins);
        $scope.$apply(function() {
            $scope.pins = pins;
            $scope.connections = data.connections;
        });
    };

    $scope.connect = function(sensor, actuator) {
        // TODO server
        $scope.connections.push({
            source: sensor,
            target: actuator,
        });
    };

    $scope.disconnect = function(sensor, actuator) {
        // TODO server
        $scope.connections = _.filter($scope.connections, function(c) {
            return !(c.source === sensor && c.target === actuator);
        });
    };

}]);

// sensor and actuator directives both inherit from cat.pin_base
cat.pin_base = function(click_callback_maker) {

    return function($scope, $el, attrs) {
        var $endpoint = $el.find('.endpoint');

        $endpoint.on(cat.tap, click_callback_maker($scope, $el, attrs));

        $el.on('$destroy', function() {
            $endpoint.off(cat.tap);
        });

        $(document).trigger('rendered-pin', attrs.id);
    }
};

cat.app.directive('sensor', function($document) {

    var sensor_callback_maker = function($scope, $el, attrs) {
        return function(e) {
            var already_activated = $el.hasClass('activated');
            $('.pin').removeClass('activated');
            if (!already_activated) {
                $el.addClass('activated');
                $('.actuator').addClass('activated');
            }
        }
    };

    return {link: cat.pin_base(sensor_callback_maker)};
});

cat.app.directive('actuator', function($document) {

    var actuator_callback_maker = function($scope, $el, attrs) {
        return function(e) {
            if (!$el.hasClass('activated')) {
                return;
            }
            var $sensor = $('.sensor.activated').first();
            var sensor = $sensor.attr('id'); // pin id
            if (_.filter($scope.connections, function(c) { return c.sensor === sensor && c.actuator === attrs.id}).length > 0) {
                // already connected, so ask if they want to delete the connection
                $('#connect-' + sensor + '-' + attrs.id).trigger(cat.tap);
            } else {
                $scope.$apply(function() {
                    $scope.connect(sensor, attrs.id);
                });
            }
            $('.pin').removeClass('activated');
        }
    };

    return {link: cat.pin_base(actuator_callback_maker)};
});


cat.app.directive('connection', function($document) {
    function link($scope, $el, attrs) {

        var $sensor, $actuator, connection, msg;
        $sensor = $actuator = connection = msg = null;

        function render() {
            if (connection !== null) {
                connection.unbind(cat.tap);
                $el.off(cat.tap);
            }
            $sensor = $('#'+attrs.sensorId);
            $actuator = $('#'+attrs.actuatorId);
            // TODO how to give a better title to the popup
            msg = 'Do you want to delete the ' + $sensor.data('name') + ' - ' + $actuator.data('name') + ' connection?';
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

            function remove_self(e) {
                if (confirm(msg)) {
                    connection.unbind(cat.tap);
                    $el.off(cat.tap);
                    $scope.$apply(function() {
                        $scope.disconnect(attrs.sensorId, attrs.actuatorId);
                    });
                }
            }

            // can remove connection by clicking connection
            connection.bind(cat.tap, remove_self);
            // can remove connection when actuator triggers cat.tap on $el
            $el.on(cat.tap, remove_self);
        }

        // only render when it's safe
        if (cat.is_safe_to_render_connections()) {
            render();
        } else {
            $el.on('render-connection', function() {
                render();
            });
        }

        $el.on('$destroy', function() {
            if (connection !== null) {
                connection.unbind(cat.tap);
                jsPlumb.detach(connection);
            }
        });
    }

    return {
        link: link,
    };
});

