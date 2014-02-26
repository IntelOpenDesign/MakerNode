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

cat.app.controller('PinsCtrl', ['$scope', 'server', function($scope, server) {

    // TODO take this out when done debugging
    window.$scope = $scope;

    $scope.sync = function() {
        // TODO it might be better to modify $scope.pins and $scope.connections only in the ways they differ to avoid redrawing everything all the time... but we'll see if this works fine it'll be simpler
        console.log('controller $scope.sync');
        $scope.pins = server.getPins();
        $scope.connections = server.getConnections();
    };


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

    $scope.sync();
    server.addSubscriber(this, $scope.sync);

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
    }

}]);

cat.pin_base = function($scope, $el, attrs, click_callback) {
    return function($scope, $el, attrs) {
        var $endpoint = $el.find('.endpoint');
        var clickevent = 'mousedown';
        var name = attrs.name;

        $endpoint.on(clickevent, click_callback);

        $el.on('$destroy', function() {
            $endpoint.off(clickevent);
        });
    }
};

cat.app.directive('sensor', function($document) {

    var my_callback = function(e) {
        var already_activated = $el.hasClass('activated');
        $('.pin').removeClass('activated');
        if (!already_activated) {
            $el.addClass('activated');
            $('.actuator').addClass('activated');
        }
    };

    return {link: cat.pin_base(my_callback)};
});

cat.app.directive('actuator', function($document) {

    var my_callback = function(e) {
        if (!$el.hasClass('activated')) {
            return;
        }
        var $sensor = $('.sensor.activated').first();
        $scope.$apply(function() {
            $scope.connect($sensor, $el);
        });
        $('.pin').removeClass('activated');
    };

    return {link: cat.pin_base(my_callback)};
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

        connection.bind('mousedown', function(e) {
            if (confirm(msg)) {
                connection.unbind('mousedown');
                $scope.$apply(function() {
                    $scope.disconnect($sensor, $actuator);
                });
                jsPlumb.detach(connection);
            }
        });

        $el.on('$destroy', function() {
            connection.unbind('mousedown');
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
            pins[pin_order[i]].value = parseFloat(pin_states[i])*100;
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

        connections = [];
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
