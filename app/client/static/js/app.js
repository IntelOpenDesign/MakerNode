var makernode = {};

makernode.app = angular.module('MakerNode', ['ngRoute']);

makernode.routes = {
    init: {
        hash: '',
        controller: 'InitCtrl',
        template: 'empty',
    },
    // NOTE every route with controller FormCtrl must have a socket_msg_type
    // which is used to submit its form contents to the server
    confirm_network: {
        hash: 'confirm_network',
        controller: 'FormCtrl',
        template: 'confirm_network',
        socket_msg_type: 'confirm_mac',
    },
    create_user: {
        hash: 'create_user',
        controller: 'FormCtrl',
        template: 'create_user',
        socket_msg_type: 'create_user',
    },
    wifi_setup: {
        hash: 'wifi_setup',
        controller: 'FormCtrl',
        template: 'wifi_setup',
        socket_msg_type: 'router_setup',
    },
    connecting: {
        hash: 'connecting',
        controller: 'EmptyCtrl',
        template: 'connecting_to_router',
    },
    test_pin: {
        hash: 'test_pin',
        controller: 'EmptyCtrl',
        template: 'test_pin',
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

makernode.setup_steps = ['confirm_network', 'create_user', 'wifi_setup', 'connecting', 'test_pin'];

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

    $scope.ws.on('connect', function() {
        console.log('connected to websocket');
    });

    $scope.ws.on('redirect', function(data) {
        // TODO these timeouts are kind of sketchy, but they work.
        console.log('Server is telling us to get ready to REDIRECT');
        // wait here to let the connecting page finish loading, images and all
        setTimeout(function(){
            console.log('We are about to reply to the server saying we are ready to redirect');
            $scope.send_server_update('redirect', {});
            // wait here to give the server a chance to get the message and
            // take down its wifi hotspot.
            // TODO I do not think this wait here is necessary, but in any case
            // the server is going to take like 2 minutes to do its thing so
            // waiting one extra second here does not really matter.
            setTimeout(function(){
                console.log('We are about to call makernode.rc.redirect with url', data.url, 'port', data.port);
                makernode.rc.redirect(data.url, data.ping_port, data.port);
            }, 1000);
        }, 1000);
    });

    $scope.send_server_update = function(msg_type, d) {
        $scope.ws.emit(msg_type, d);
    };

    $scope.set_pin_val = function(id, val) {
        pinsync.set_pin_val(id, val);
    };

    $scope.toggle_pin_value = function(id) {
        console.log('$scope.toggle_pin_value of pin id', id);
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
        console.log(
            'We are about to go to the next route', next_route.hash,
            'and send the server a msg of type', my_route.socket_msg_type,
            'with data', JSON.stringify($scope.form, null, 2) );
        makernode.rc.goTo(next_route);
        $scope.send_server_update(my_route.socket_msg_type, $scope.form);
    };
}]);

makernode.app.controller('InitCtrl', ['$scope', function($scope) {
    // when we get a reply about what mode we are in,
    // go to the appropriate page
    $scope.ws.on('mode', function(mode) {
        if (mode === 'setup') {
            makernode.rc.goTo(makernode.routes.confirm_network);
        } else {
            makernode.rc.goTo(makernode.routes.test_pin);
        }
    });
    // ask what mode we are in
    $scope.ws.emit('mode', {});
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
    // which pins have changed, so we will send them to the server
    var changed_pin_ids = {};
    // messages not yet processed by the server
    var old_msgs = {};
    // the prefix and count make msg_id's more human readable
    var msg_id_prefix = parseInt(Math.random() * 100).toString();
    var msg_id_count = 0;

    $scope[ws].on('pins', function(server_msg) {
        $scope.$apply(function() {
            console.log('SERVER MSG', JSON.stringify(server_msg, null, 2));
            var data = _.extend({}, server_msg);
            delete old_msgs[server_msg.msg_id_processed];

            var old_updates = _.sortBy(_.values(old_msgs), function(o) {
                return o.time;
            });
        
            _.each(old_updates, function(o) {
                console.log(
                    'The server has still not processed our update',
                    JSON.stringify(o, null, 2),
                    'and so we will overwrite the server info with this.' );
                _.each(data.pins, function(pin, id) {
                    _.extend(pin, o.pins[id]);
                });
            });
            data.pins = makernode.my_pin_format(data.pins);
            if (!got_data) {
                $scope[d].reset(data);
            } else {
                $scope[d].update(data);
            }
            got_data = true;
        });
    });

    // TODO just send pins if there are updates for them
    var send_pin_update = _.throttle(function() {
        var now = Date.now();
        var msg_id = msg_id_prefix + '-' + (msg_id_count++) + '-' + now;
        var changed_pins = _.pick($scope.d.pins, _.keys(changed_pin_ids));        
        var server_pins =  makernode.server_pin_format(changed_pins);
        old_msgs[msg_id] = {
            pins: server_pins,
            time: now,
            msg_id: msg_id,
        };
        var data = {
            pins: server_pins,
            msg_id: msg_id,
        };
        console.log('sending this data to the server:', JSON.stringify(data, null, 2));
        $scope[ws].emit('pins', data);
        changed_pin_ids = {};
    }, 100);

    var set_pin_val = function(id, val) {
        console.log('pinsync.set_pin_val id', id, 'val', val);
        $scope[d].pins[id].value = val;
        changed_pin_ids[id] = true;
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
        pins[id].id = id;
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
        delete pins[id].id;
        delete pins[id].$$hashKey; // angular puts this in
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

    that.redirect = function(url, ping_port, port) {
        // test for connection here:
        var test_url = 'http://' + url + ':' + ping_port + '/';
        // then go to here:
        var http_url = 'http://' + url + ':' + port + '/';
        var keep_trying = true;

        console.log('makernode.rc.redirect is attempting to ping test_url',
            test_url, 'and when it connects it will try to redirect to http_url',
            http_url);

        // Yes, we are pessimists. Expect failure and prepare the error msg.
        var timeout_id = setTimeout(function() {
            keep_trying = false;
            console.log('Reconnecting to Galileo has failed.');
        }, 20 * 60 * 1000); // 20 minutes

        var count = 0;
        function attempt() {
            if (!keep_trying) {
                return;
            }
            console.log('Attempt #', ++count);
            $.get(test_url, {}, function() {
                keep_trying = false;
                window.location = http_url;
            });
            setTimeout(attempt, 5000);
        };
        attempt();
    };

    return that;
}();

