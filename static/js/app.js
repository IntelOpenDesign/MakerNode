$(document).bind('pageinit', function() {

});

var cat = angular.module('ConnectAnything', []);

cat.controller('PinsCtrl', ['$scope', 'server', function($scope, server) {

    $scope.pins = server.getPins();
    $scope.sensors = _.filter($scope.pins, function(pin) {
        return pin.is_input;
    });
    $scope.actuators = _.filter($scope.pins, function(pin) {
        return !pin.is_input;
    });
}]);

cat.factory('server', function($http) {
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
