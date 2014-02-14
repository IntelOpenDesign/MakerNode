$(document).bind('pageinit', function() {

});

var cat = angular.module('ConnectAnything', []);

cat.controller('PinsCtrl', ['$scope', function($scope, server) {

    $scope.sensors = function() {
        // TODO return sensors
    };

    $scope.actuators = function() {
        // TODO return actuators
    };

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
        _.each(pin_defaults, function(val, key) {

        });
    }

});
