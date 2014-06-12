var makernode = {};

makernode.app = angular.module('MakerNode', ['ngRoute']);

makernode.routes = {
    init: {
        hash: '',
        server_code: null,
        controller: 'InitCtrl',
        template: 'empty',
    },
    confirm_mac: {
        hash: 'confirm_mac_address',
        server_code: 'confirm_mac_address',
        controller: 'FormCtrl',
        template: 'confirm_mac',
    },
    wifi_setup: {
        hash: 'wifi_router_setup',
        server_code: 'wifi_router_setup',
        controller: 'FormCtrl',
        template: 'wifi_setup',
    },
    create_user: {
        hash: 'create_user',
        server_code: 'create_user',
        controller: 'FormCtrl',
        template: 'create_user',
    },
    app_home: {
        hash: 'home',
        server_code: 'home',
        controller: 'HomeCtrl',
        template: 'home',
    },
};

makernode.app.config(['$routeProvider', function($routeProvider) {
    _.each(makernode.routes, function(o, route) {
        $routeProvider.when('/' + o.hash, {
            templateUrl: 'templates/' + o.template + '.html',
            controller: o.controller,
        });
    });
}]);

// TODO HTTP call
// TODO HTTP Server wrapper
// TODO HTTP Server back end

// the highest level app controller from which all others inherit
makernode.app.controller('AppCtrl', ['$scope', '$location', function($scope, $location) {

    $scope.$location = $location;
    $scope.routes = makernode.routes;

    $scope.goTo = function(route) {
        window.location.hash = '#/' + route.hash;
    };
    $scope.goBack = function(n) {
        window.history.go(-n);
    };
}]);

makernode.app.controller('InitCtrl', ['$scope', function($scope) {
    //$scope.goTo($scope.routes.confirm_mac);
}]);

makernode.app.controller('FormCtrl', ['$scope', function($scope) {
    $scope.form = {};
}]);

makernode.app.controller('HomeCtrl', ['$scope', function($scope) {

}]);
