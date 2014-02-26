// TODO remove when done debugging
function toggle_debug_log() {
    $('#debug-log').toggleClass('hide');
}

jsPlumb.bind('ready', function() {
    jsPlumb.Defaults.Container = $('#field');

    /* some combination of this might work -- laggy/buggy though
     * ALSO: how to do it on mobile?
    $('#sensors').sortable();
    $('#actuators').sortable();
    jsPlumb.draggable($('.sensor'), {containment: '#sensors'});
    jsPlumb.draggable($('.actuator'), {containment: '#actuators'});
    */
});

var cat = {};

cat.server_url = 'ws://192.168.0.192:8001';
// use this one when you are on the Galileo
// cat.server_url = 'ws://cat/';

cat.app = angular.module('ConnectAnything', []);

cat.app.filter('sensors', function() {
    return function(pins) {
        return _.filter(pins, function(pin) {
            return pin.is_input && pin.is_visible;
        });
    };
});

cat.app.filter('actuators', function() {
    return function(pins) {
        return _.filter(pins, function(pin) {
            return !pin.is_input && pin.is_visible;
        });
    };
});

cat.app.controller('PinsCtrl', ['$scope', function($scope, server) {

    // TODO take this out when done debugging
    window.$scope = $scope;
    var pin_order = ['0', '1', '2', '~3', '4', '~5', '~6', '7', '8', '~9', '~10', '~11', '12', '13', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
    var start_data = cat.get_fake_initial_data();
    $scope.pins = start_data.pins;
    $scope.connections = start_data.connections;

    // http://clintberry.com/2013/angular-js-websocket-service/
    var ws = new WebSocket(cat.server_url);
    // use this when on the Galileo
    //var ws = new WebSocket(cat.server_url, 'hardware-state-protocol');
    ws.onopen = function() {
        console.log('socket opened');
    };
    var $debug_log = $('#debug-log');
    ws.onmessage = function(message) {
        console.log('websocket message', message.data);
        //TODO remove when done debugging
        $debug_log.html(message.data);
        var pin_states = message.data.split(',');
        $scope.$apply(function(){
            for (var i = 0; i < pin_states.length; i++) {
                var pin = $scope.pins[pin_order[i]];
                // for the time being on the sensor pin values from the server are meaningful
                if (pin.is_input) {
                    pin.value = parseFloat(pin_states[i])*100;
                }
            }
        });
    };

    $scope.connect = function(sensor, actuator) {
        // TODO server
        $scope.connections.push({
            sensor: sensor,
            actuator: actuator,
        });
        $scope.pins[sensor].connected_to.push(actuator);
        $scope.pins[actuator].connected_to.push(sensor);
    };

    $scope.disconnect = function(sensor, actuator) {
        // TODO server
        console.log('before disconnect we have', $scope.connections.length, 'connections');
        $scope.connections = _.filter($scope.connections, function(c) {
            return !(c.sensor === sensor && c.actuator === actuator);
        });
        console.log('midway disconnect we have', $scope.connections.length, 'connections');
        $scope.pins[sensor].connected_to = _.filter($scope.pins[sensor].connected_to, function(pin) {
            return !(pin === actuator);
        });
        $scope.pins[actuator].connected_to = _.filter($scope.pins[actuator].connected_to, function(pin) {
            return !(pin === sensor);
        });
        console.log('after disconnect we have', $scope.connections.length, 'connections');
    }

}]);

// shared between sensors and actuators
cat.pin_initializer = function($document, $scope, $el, attrs) {
    var that = {};
    that.$endpoint = $el.find('.endpoint');
    that.clickevent = 'mousedown';
    that.name = attrs.name;
    return that;
};

cat.app.directive('sensor', function($document) {
    function link($scope, $el, attrs) {

        var that = cat.pin_initializer($document, $scope, $el, attrs);

        that.$endpoint.on(that.clickevent, function(e) {
            var already_activated = $el.hasClass('activated');
            $('.pin').removeClass('activated');
            if (!already_activated) {
                $el.addClass('activated');
                $('.actuator').addClass('activated');
            }
        });

        $el.on('$destroy', function() {
            that.$endpoint.off(that.clickevent);
        });
    }

    // TODO is there an unlink function i should write so that i can remove listeners when this gets deleted?

    return {
        link: link,
    }
});

cat.app.directive('actuator', function($document) {
    function link($scope, $el, attrs) {

        var that = cat.pin_initializer($document, $scope, $el, attrs);

        that.$endpoint.on(that.clickevent, function(e) {
            if (!$el.hasClass('activated')) {
                return;
            }
            var $sensor = $('.sensor.activated').first();
            var sensor = $sensor.attr('id'); // pin name
            if ($scope.pins[attrs.name].connected_to.indexOf(sensor) >= 0) {
                // already connected, so ask if they want to delete the connection
                $('#connect-' + sensor + '-' + attrs.name).trigger('mousedown');
            } else {
                $scope.$apply(function() {
                    $scope.connect(sensor, attrs.name);
                });
            }
            $('.pin').removeClass('activated');
        });

        $el.on('$destroy', function() {
            that.$endpoint.off(that.clickevent);
        });
    }

    return {
        link: link,
    }
});

cat.app.directive('connection', function($document) {
    function link($scope, $el, attrs) {

        var $sensor = $('#'+attrs.sensor);
        var $actuator = $('#'+attrs.actuator);

        var connection = jsPlumb.connect({
            source: attrs.sensor,
            target: attrs.actuator,
            connector: ['Bezier', {curviness: 70}],
            cssClass: 'connection pins-'+attrs.sensor+'-'+attrs.actuator,
            endpoint: 'Blank',
            endpointClass: 'endpoint pins-'+attrs.sensor+'-'+attrs.actuator,
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

        var msg = 'Do you want to delete the ' + $sensor.attr('id') + ' - ' + $actuator.attr('id') + ' connection?';

        function remove_self(e) {
            if (confirm(msg)) {
                connection.unbind('mousedown');
                $scope.$apply(function() {
                    $scope.disconnect(attrs.sensor, attrs.actuator);
                });
            }
        }

        connection.bind('mousedown', remove_self);
        $el.on('mousedown', remove_self);

        $el.on('$destroy', function() {
            connection.unbind('mousedown');
            jsPlumb.detach(connection);
        });
    }

    return {
        link: link,
    };
});

cat.get_fake_initial_data = function() {

    var pin_defaults = {
        'input': {
            'analog': [0, 1, 2, 3, 4, 5],
        },
        'output': {
            'analog': [3, 5, 6, 9, 10, 11],
            'digital': [0, 1, 2, 4, 7, 8, 12, 13],
        },
    };

    function pin_name(number, is_analog, is_input) {
        if (!is_analog) {
            return number.toString();
        }
        // is_analog === true
        if (is_input) {
            return 'A' + number;
        } else {
            return '~' + number;
        }
    }

    pins = {};
    _.each(pin_defaults, function(obj, IorO) { // input or output
        _.each(obj, function(nums, AorD) { // analog or digital
            _.each(nums, function(num) { // all pin numbers of this type
                var is_input = IorO === 'input';
                var is_analog = AorD === 'analog';
                var name = pin_name(num, is_analog, is_input);
                pins[name] = {
                    'name': name,
                    'label': 'Label for ' + name,
                    'is_analog': is_analog,
                    'is_input': is_input,
                    'value': 0,
                    'is_visible': true,
                    'connected_to': [],
                };
            });
        });
    });

    // TODO merge in sync-connections branch so that you can start with some connections
    connections = [];

    return {pins: pins, connections: connections};
};
