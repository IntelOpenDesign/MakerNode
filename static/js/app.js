var cat = {};

cat.jsplumb_ready = false;

jsPlumb.bind('ready', function() {
    jsPlumb.Defaults.Container = $('#field');

    cat.jsplumb_ready = true;
    $(document).trigger('jsplumb-ready');

    /* some combination of this might work -- laggy/buggy though
     * ALSO: how to do it on mobile?
    $('#sensors').sortable();
    $('#actuators').sortable();
    jsPlumb.draggable($('.sensor'), {containment: '#sensors'});
    jsPlumb.draggable($('.actuator'), {containment: '#actuators'});
    */
});

cat.server_url = 'ws://10.12.10.58:8001';
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

cat.is_safe_to_render_connections = function() {
    // connections can only draw themselves AFTER their pins have drawn
    // and AFTER jsPlumb has had a chance to initialize itself
    console.log('is_safe_to_render_connections constructor function');

    // TODO I think I could use a promise here and it would be nicer.

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
        console.log('is_safe_to_render_connections caught reset-pins event with data', pins);
        console.log('is_safe_to_render_connections init with pins', pins);
        visible_pins = _.filter(pins, function(pin) {
            return pin.is_visible;
        });
        rendered_pins = {};
        all_pins_rendered = false;
    });

    $document.on('rendered-pin', function(e, pin) {
        console.log('is_safe_to_render_connections caught rendered-pin event with data', pin);
        if (pin === undefined) {
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

cat.app.controller('PinsCtrl', ['$scope', 'server', function($scope, server) {

    // TODO take this out when done debugging
    window.$PinsCtrlScope = $scope;

    var $document = $(document);
    var sync = function() {
        // TODO maybe just update the changes rather than rewrite?
        $scope.pins = server.getPins();
        console.log('$document about to trigger reset-pins from within PinsCtrl');
        $document.trigger('reset-pins', $scope.pins);
    };

    sync();
    server.addSubscriber(this, sync);

    function update_pin(name, attr, val) {
        $scope.pins[name][attr] = val;
        server.update();
    }
    $scope.addPin = function(name) {
        update_pin(name, 'is_visible', true);
    };
    $scope.removePin = function(name) {
        update_pin(name, 'is_visible', false);
    };
}]);

cat.app.controller('ConnectionsCtrl', ['$scope', 'server', function($scope, server) {

    // TODO debugging
    window.$ConnectionsCtrlScope = $scope;

    var sync = function() {
        // TODO maybe just update how things differ rather than rewrite?
        $scope.connections = server.getConnections();
    };

    sync();
    server.addSubscriber(this, sync);

    // TODO this should probably be in a ConnectionsCtrl
    $scope.connect = function($sensor, $actuator) {
        // TODO server
        var sensor = $sensor.attr('id');
        var actuator = $actuator.attr('id');
        $scope.connections.push({
            sensor: sensor,
            actuator: actuator,
        });
        $scope.pins[sensor].connected_to.push(actuator);
        $scope.pins[actuator].connected_to.push(sensor);
    };

    $scope.disconnect = function($sensor, $actuator) {
        // TODO server
        var sensor = $sensor.attr('id');
        var actuator = $actuator.attr('id');
        $scope.connections = _.filter($scope.connections, function(c) {
            return !(c.sensor === sensor && c.actuator === actuator);
        });
        $scope.pins[sensor].connected_to = _.filter($scope.pins[sensor].connected_to, function(pin) {
            return !(pin === actuator);
        });
        $scope.pins[actuator].connected_to = _.filter($scope.pins[actuator].connected_to, function(pin) {
            return !(pin === sensor);
        });
    };
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

        $(document).trigger('rendered-pin', attrs.name);
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
                    $scope.connect($sensor, $el);
                });
            }
            $('.pin').removeClass('activated');
        });

        $el.on('$destroy', function() {
            that.$endpoint.off(that.clickevent);
        });

        $(document).trigger('rendered-pin', attrs.name);
    }

    return {
        link: link,
    }
});

cat.app.directive('connection', function($document) {
    function link($scope, $el, attrs) {

        var $sensor, $actuator, connection, msg;
        $sensor = $actuator = connection = msg = null;

        function render() {
            console.log('rendering connection ', attrs.sensor, '-', attrs.actuator);
            $sensor = $('#'+attrs.sensor);
            $actuator = $('#'+attrs.actuator);
            console.log($sensor, $actuator);
            msg = 'Do you want to delete the ' + $sensor.attr('id') + ' - ' + $actuator.attr('id') + ' connection?';
            connection = jsPlumb.connect({
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

            function remove_self(e) {
                if (confirm(msg)) {
                    connection.unbind('mousedown');
                    $scope.$apply(function() {
                        $scope.disconnect($sensor, $actuator);
                    });
                    jsPlumb.detach(connection);
                }
            }

            connection.bind('mousedown', remove_self);
            $el.on('mousedown', remove_self);
        }

        if (cat.is_safe_to_render_connections()) {
            render();
        } else {
            $el.on('render-connection', function() {
                render();
            });
        }

        $el.on('$destroy', function() {
            if (connection !== null) {
                connection.unbind('mousedown');
            }
        });
    }

    return {
        link: link,
    };
});

cat.app.factory('server', ['$q', '$rootScope', function($q, $rootScope) {
    // TODO replace this with real server data
    // TODO i think the inputs will be sensors and the outputs will be actuators - right?
    // The server is just for communicating with the server
    // The PinsCtrl maintains consistent state for the model of this app

    var pins = {};
    var pin_order = ['0', '1', '2', '~3', '4', '~5', '~6', '7', '8', '~9', '~10', '~11', '12', '13', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
    var connections = [];
    var subscribers = [];

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
        for (var i = 0; i < pin_states.length; i++) {
            var pin = pins[pin_order[i]];
            // for the time being on the sensor pin values from the server are meaningful
            if (pin.is_input) {
                pin.value = parseFloat(pin_states[i])*100;
            }
        }
        _.each(subscribers, function(o) {
            $scope.$apply(function(){
                o.func.call(o.context);
            });
        });
    };
    function sendMessage() {
        ws.send('hello from browser land');
    }
    // TODO remove this when done testing
    window.sendMessage = sendMessage;

    function getPins() {
        return pins;
    }

    function getConnections() {
        return connections;
    }

    function addSubscriber(context, func) {
        subscribers.push({context: context, func: func});
    }

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

    function read() {
        // TODO HTTP GET
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

        connections = [{source: 'A0', target: '1'},
                       {source: 'A1', target: '1'}];
    }

    function write() {
        // TODO format data from $scope.pins and $scope.connections
        // TODO HTTP POST
    }

    function update() {
        write();
        read();
        _.each(subscribers, function(o) {
            o.func.call(o.context);
        });
    }

    read();

    return {
        getPins: getPins,
        getConnections: getConnections,
        addSubscriber: addSubscriber,
        update: update,
        sendMessage: sendMessage,
    };

}]);
