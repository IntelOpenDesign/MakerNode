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

// base filter for pins, used in ng-repeat to determine lists of sensors and
// actuators to show.
// pin_selector is the function that returns true for pins that should be included
// connection_end is 'sensor' or 'actuator'
// note that this can really only be used to filter for all sensors or all actuators the way it is written; it is not a general purpose helper function for filtering pins in other ways
cat.pins_filter = function(pin_selector, connection_end) {
    return function(o) {
        var pins_list = _.filter(o.pins, pin_selector);
        var pins_dict = _.object(_.map(pins_list, function(pin) {
            return [pin.id, _.extend(pin, {is_connected: false})];
        }));
        _.each(o.connections, function(c) {
            if (_.has(pins_dict, c[connection_end])) {
                pins_dict[c[connection_end]].is_connected = true;
            }
        });
        return _.values(pins_dict);
    };
};
cat.app.filter('sensors', function() {
    return cat.pins_filter(function(pin) {
        return pin.is_input && pin.is_visible;
    }, 'sensor');
});
cat.app.filter('actuators', function() {
    return cat.pins_filter(function(pin) {
        return !pin.is_input && pin.is_visible;
    }, 'actuator');
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
        visible_pins = _.pluck(_.filter(pins, function(pin) {
            return pin.is_visible;
        }), 'id');
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

    $scope.pins = cat.initialize_pins();
    $scope.connections = cat.initialize_connections();
    $document.trigger('reset-pins', $scope.pins);

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

        $scope.$apply(function() {
            $scope.pins = data.pins;
            $scope.connections = data.connections;
        });
        // you need to trigger this IFF you are causing pins to be redrawn
        $document.trigger('reset-pins', $scope.pins);
    };

    $scope.connect = function(sensor, actuator) {
        // TODO server
        $scope.connections.push({
            sensor: sensor,
            actuator: actuator,
        });
    };

    $scope.disconnect = function(sensor, actuator) {
        // TODO server
        $scope.connections = _.filter($scope.connections, function(c) {
            return !(c.sensor === sensor && c.actuator === actuator);
        });
    };

    $scope.pin_name = function (pin) {
        if (!pin.is_input && pin.is_analog) {
            return '~' + pin.id; // ex. '~3'
        }
        return pin.id; // ex. 'A0' or '1'
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

cat.pin_ids = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'];


// initialize pins and connections
// matches expected JSON format from server
cat.initialize_pins = function() {
    var pins = {};
    _.each(cat.pin_ids, function(id) {
        pins[id] = {
            id: id, // TODO right now assuming client and server ids match
            label: '',         // init from server
            is_input: false,   // init from server
            is_analog: false,  // init from server
            is_visible: false, // init from server
            value: 0,          // init from server
        };
    });
    return pins;
};

cat.initialize_connections = function() {
    return [];
};



