var app = angular.module('Experiment9', []);

app.controller('PathCtrl', ['$scope', function($scope) {
    $scope.start = {x: 0, y: 0};
    $scope.end = {x: 0, y: 0};
}]);
