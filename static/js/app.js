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

cat.app = angular.module('ConnectAnything', []);

cat.app.controller('PinsCtrl', ['$scope', 'server', function($scope, server) {

    $scope.pins = server.getPins();
    $scope.sensors = _.filter($scope.pins, function(pin) {
        return pin.is_input;
    });
    $scope.actuators = _.filter($scope.pins, function(pin) {
        return !pin.is_input;
    });
    //TODO add $watch to update sensors and actuators when we get new pins from server

    // TODO this does not belong in a controller
    $scope.connect = function(sensor, actuator) {
        // sensor and actuator are jQuery objects
        jsPlumb.connect({
            source: sensor.attr('id'),
            target: actuator.attr('id'),
            connector: ['Bezier', {curviness: 70}],
            cssClass: 'connection',
            endpoint: 'Blank',
            endpointClass: 'endpoint',
            anchors: ['Right', 'Left'],
            paintStyle: {
                lineWidth: 4,
                strokeStyle: '#aabbaa',
                outlineWidth: 1,
                outlineColor: '#000',
            },
            endpointStyle: {
                fillStyle: '#a7b04b',
            },
            hoverPaintStyle: {
                strokeStyle: '#fff',
            },
        });
        // TODO send connection info to server
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
    }

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
            $scope.connect($sensor, $el);
            $('.pin').removeClass('activated');
        });
    }

    return {
        link: link,
    }
});

cat.app.factory('server', function($http) {
    // TODO replace this with real server data
    // TODO i think the inputs will be sensors and the outputs will be actuators - right?
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

    function getPins() {
        var pins = {};
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
                        'connections': [],
                    };
                });
            });
        });
        return pins;
    }

    return {
        getPins: getPins,
    };

});
