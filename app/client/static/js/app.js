var makernode = {};

makernode.app = angular.module('MakerNode', ['ngRoute']);

makernode.routes = {
    init: {
        hash: '',
        controller: 'EmptyCtrl',
        template: 'empty',
    },
    // NOTE every route with controller FormCtrl must have a socket_msg_type
    // which is used to submit its form contents to the server
    confirm_mac: {
        hash: 'confirm_network',
        controller: 'FormCtrl',
        template: 'confirm_mac',
        socket_msg_type: 'confirm_mac',
    },
    wifi_setup: {
        hash: 'wifi_router_setup',
        controller: 'FormCtrl',
        template: 'wifi_setup',
        socket_msg_type: 'router_setup',
    },
    create_user: {
        hash: 'create_password',
        controller: 'FormCtrl',
        template: 'create_user',
        socket_msg_type: 'create_user',
    },
    connecting: {
        hash: 'connecting',
        controller: 'EmptyCtrl',
        template: 'connecting_to_router',
    },
    control_mode: {
        hash: 'controller',
        controller: 'EmptyCtrl',
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

makernode.setup_steps = ['confirm_mac', 'create_user', 'wifi_setup', 'connecting', 'control_mode'];

// The highest level app controller from which all others inherit
makernode.app.controller('AppCtrl', ['$scope', function($scope) {

    window.$scope = $scope;

    $scope.routes = makernode.routes;

    // pins data structure
    $scope.d = makernode.d();
    // websocket connection with server
    $scope.ws = io();
    // sync pins with server
    var pinsync = makernode.ws_pin_sync($scope, 'ws', 'd');
    // should we be trying to redirect to a new URL right now?
    var redirecting = false;
    var redirect_url;

    $scope.ws.on('connect', function() {
        console.log('connected to websocket');
        if (redirecting) {
            redirecting = false;
            window.location = 'http://' + redirect_url + '/#/' + makernode.routes.control_mode.hash;
        }
    });

    $scope.ws.on('redirect', function(data) {
        console.log('REDIRECT');
        redirecting = true;
        redirect_url = data.url + ':' + data.port;
        $scope.ws = io(redirect_url);
    });

    $scope.send_server_update = function(msg_type, d) {
        $scope.ws.emit(msg_type, d);
    };

    $scope.set_pin_val = function(id, val) {
        pinsync.set_pin_val(id, val);
    };

    $scope.toggle_pin_value = function(id) {
        var pin = $scope.d.pins[id];
        if (pin.is_input) return;
        var new_val = pin.value === 100 ? 0 : 100;
        pinsync.set_pin_val(id, new_val);
    };
}]);

makernode.app.controller('EmptyCtrl', ['$scope', function($scope) {
}]);

makernode.app.controller('FormCtrl', ['$scope', function($scope) {
    $scope.form = {};
    var my_route_key = makernode.rc.currentRouteKey();
    var my_route = makernode.routes[my_route_key];
    var my_route_i = makernode.setup_steps.indexOf(my_route_key);
    var next_route_key = makernode.setup_steps[my_route_i + 1];
    var next_route = makernode.routes[next_route_key];
    $scope.submit = function() {
        $scope.send_server_update(my_route.socket_msg_type, $scope.form);
        makernode.rc.goTo(next_route);
    };
}]);

makernode.app.directive('stepsPics', function($document) {
    function link($scope, $el, attrs) {
        $scope.attrs = attrs; // TODO is this necessary?
        $scope.attrs.step = parseInt(attrs.step);
    }
    return { templateUrl: 'templates/steps_pics.html', link: link };
});

makernode.app.directive('pinButton', function($document) {
    return { templateUrl: 'templates/pin_button.html' };
});

makernode.app.directive('pinSlider', function($document) {
    return { templateUrl: 'templates/pin_slider.html' };
});

// Data structure for pins
// Updates itself when given new info from server
// Convenient for angular templates
makernode.d = function() {
    var that = {};
    that.pins = {};

    that.sensors = [];
    that.actuators = [];

    var sync = function() {
        var sen = [], act = [];
        _.each(that.pins, function(pin, id) {
            if (pin.is_input) {
                sen.push(pin);
            } else {
                act.push(pin);
            }
        });
        that.sensors = sen;
        that.actuators = act;
    };

    that.reset = function(data) {
        that.pins = data.pins;
        sync();
    };

    that.update = function(data) {
        _.each(data.pins, function(pin, id) {
            _.each(pin, function(val, attr) {
                that.pins[id][attr] = val;
            });
        });
        sync();
    };

    return that;
};

// Syncs pin data with server
// Provides makernode.d with new info from server
// Handles multi-client syncing issues
makernode.ws_pin_sync = function($scope, ws, d) {

    var got_data = false;
    var old_msgs = {}; // messages not yet processed by the server

    $scope[ws].on('pins', function(server_msg) {
        var data = _.extend({}, server_msg);
        delete old_msgs[server_msg.msg_id_processed];
        _.each(old_msgs, function(o, msg_id) {
            _.extend(data, o);
        });
        if (!got_data) {
            $scope[d].reset(data);
        } else {
            $scope[d].update(data);
        }
        got_data = true;
    });

    var send_pin_update = _.throttle(function() {
        var data = {
            server_pins: makernode.server_pin_format($scope.d.pins),
            msg_id: Date.now().toString() + Math.random().toString()
        };
        old_msgs[data.msg_id] = data;
        $scope[ws].emit('pins', data);
    }, 100);

    var set_pin_val = function(id, val) {
        $scope[d].pins[id].value = val;
        send_pin_update();
    };

    return {
        set_pin_val: set_pin_val
    };
};

// translate server pin format into client pin format
makernode.my_pin_format = function(server_pins) {
    var pins = {};

    _.each(server_pins, function(pin, id) {
        var name = id;
        if (pin.is_analog && !pin.is_input)   // analog out:
            name = '~' + id;                  // ex. '~3'
        if (pin.is_analog && pin.is_input)    // analog in:
            name = 'A' + (parseInt(id) - 14); // 14 = A0, 15 = A1, etc

        pins[id] = _.extend({}, pin);
        pins[id].name = name;
        pins[id].value = pin.value * 100;
    });

    return pins;
};

// translate client pin format into server pin format
makernode.server_pin_format = function(my_pins) {
    var pins = {};

    _.each(my_pins, function(pin, id) {
        pins[id] = _.extend({}, pin);
        delete pins[id].name;
        pins[id].value = pin.value / 100;
    });

    return pins;
};

// Routing utility functions
makernode.rc = function routing_utility_functions() {

    var that = {};

    that.get_route_key = function(val, attr) {
        var route_key;
        _.each(makernode.routes, function(o, key) {
            if (o[attr] === val) {
                route_key = key;
            }
        });
        return route_key;
    };
    that.currentRouteKey = function() {
        var current_hash = window.location.hash.substring('#/'.length);
        return that.get_route_key(current_hash, 'hash');
    };

    that.goTo = function(route) {
        window.location.hash = '#/' + route.hash;
    };
    that.goBack = function(n) {
        window.history.go(-n);
    };

    return that;
}();

