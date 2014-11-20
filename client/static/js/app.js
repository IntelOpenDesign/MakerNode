var makernode = {};

makernode.app = angular.module('MakerNode', ['ngRoute']);

makernode.routes = {
  init: {
    hash: '',
    controller: 'InitCtrl',
    template: 'empty',
  },
  // NOTE if you want a route with controller FormCtrl to be able to send its
  // data to the server, you must give it a socket_msg_type
  set_hostname: {
    hash: 'set_hostname',
    controller: 'FormCtrl',
    template: 'set_hostname',
    socket_msg_type: 'set_hostname',
  },
  set_root_password: {
    hash: 'set_root_password',
    controller: 'FormCtrl',
    template: 'set_root_password',
    socket_msg_type: 'set_root_password',
  },
  wifi_setup: {
    hash: 'wifi_setup',
    controller: 'FormCtrl',
    template: 'wifi_setup',
    socket_msg_type: 'router_setup',
  },
  connecting: {
    hash: 'connecting',
    controller: 'ConnectingCtrl',
    template: 'connecting_to_router',
  },
  test_pin: {
    hash: 'test_pin',
    controller: 'FormCtrl',
    template: 'test_pin',
  },
  controller: {
    hash: 'pin_monitor',
    controller: 'EmptyCtrl',
    template: 'controller',
  },
  dashboard: {
    hash: 'dashboard',
    controller: 'DashboardCtrl',
    template: 'dashboard'
  }
};

makernode.app.config(['$routeProvider',
  function($routeProvider) {
    _.each(makernode.routes, function(o, route) {
      $routeProvider.when('/' + o.hash, {
        templateUrl: 'templates/' + o.template + '.html',
        controller: o.controller,
      });
    });
  }
]);

// steps order
makernode.setup_steps = [
  'set_hostname',
  'wifi_setup',
  'connecting',
  'test_pin',
  'dashboard',
];

// The highest level app controller from which all others inherit
makernode.app.controller('AppCtrl', ['$scope',
  function($scope) {

    window.$scope = $scope;

    $scope.routes = makernode.routes;

    // pins data structure
    $scope.d = makernode.d();
    // websocket connection with server
    $scope.ws = io();
    // sync pins with server
    var pinsync = makernode.ws_pin_sync($scope, 'ws', 'd');

    $scope.scan_wifi = function() {
      if (true || makernode.rc.currentRouteKey() == 'wifi_setup') { //TODO: Scan should not happen on every page...
        $scope.ws.on('networks', function(networks) {
          console.log('got wifi network list: ' + networks);
          $('.scombobox-list').empty();
          for (var i = 0; networks && i < networks.length; i++) {
            var value = networks[i];
            if (value.indexOf('x00\\x00') === -1) { //don't show hidden networks
              var element = '<option class="wifi-network" value="' + value + '">' + value + '</option>';
              $('#combo-01').append(element);
            }
          }
          $('#combo-01').scombobox({
            empty: true
          });
          $('.scombobox-display').focus().attr('placeholder', 'Network');
          $('.show-on-load').css({
            'display': 'block'
          });
          $('.hide-on-load').css({
            'display': 'none'
          });
        });
        $scope.ws.emit('networks', {});
      }

    }

    $scope.ws.on('connect', function() {
      console.log('connected to websocket');
      $scope.scan_wifi();
    });

    $scope.ws.on('dashboard-service', function(data) {
      if (data.action == 'list') {
        function getServiceClick(name, action) {
          return function() {
            $scope.send_server_update('dashboard-service', {
              name: name,
              action: action
            });
          }
        }
        _.each(data.services, function(value, key) {
          //TODO: use an angular template here
          var id = '#service-' + key;
          if ($('#services-block ' + id).length == 0) {
            var html = '<p id="service-' + key + '" />';
            $('#services-block').append(html);
            html = '<div class="row">';
            html += '<div class="col-xs-3 text-right">'
            html += '<span title="' + gDashboardTooltips[key] + '">';
           // html += '<i class="fa fa-info-circle fa-fw"></i>'; //TODO: Implement fancier tooltips via plugin, and add on-click here..?
            html += key + '</span></div>';
            html += '<div class="col-xs-4">';
            html += '<div class="btn-group btn-toggle">';
            html += '<button class="btn btn-m btn-on" >ON</button>';
            html += '<button class="btn btn-m btn-off">OFF</button></div>';
            html += '<button class="btn btn-m btn-default btn-restart"><i class="fa fa-fw fa-refresh" />&nbsp;RESTART</button>';
            html += '</div>';
            $('#services-block ' + id).append(html);
            $(id + ' .btn-restart').click(getServiceClick(key, 'restart'));
            $(id + ' .btn-on').click(getServiceClick(key, 'start'));
            $(id + ' .btn-off').click(getServiceClick(key, 'stop'));

          }
          $(id + ' .btn-on').toggleClass('btn-success', value);
          $(id + ' .btn-off').toggleClass('btn-success', !value);
        });
      } else {
        var element = '#service-' + data.id;
        $(element + ' button').prop('disabled', (data.status == 'begin'));
        $(element + ' .btn-on').toggleClass('btn-success', data.action == 'start');
        $(element + ' .btn-off').toggleClass('btn-success', data.action == 'stop');
      }
    });

    $scope.ws.on('dashboard-info', function(data) {
      console.log('got dashboard-info');
      console.log(data);
      $('#node_version').text(data.node_version);
      $('#mraa_version').text(data.mraa_version);
      $('#ip_address').text(data.ip);
      $('#host_name').text(data.hostname);
      $('#mac_address').text(data.mac);
      $('#online').text(data.online ? 'yes' : 'no');
    });

    $scope.ws.on('redirect', function(data) {
      // TODO these timeouts are kind of sketchy, but they work.
      console.log('Server is telling us to get ready to REDIRECT');
      // wait here to let the connecting page finish loading, images and all
      // TODO instead of guessing how long it will take to load the connecting
      // page, do it on the jQuery "onload" event or something
      setTimeout(function() {
        console.log('We are about to reply to the server saying we are ready to redirect');
        $scope.send_server_update('redirect', {});
        // wait here to give the server a chance to get the message and
        // take down its wifi hotspot.
        // TODO I do not think this wait here is necessary, but in any case
        // the server is going to take like 2 minutes to do its thing so
        // waiting one extra second here does not really matter.
        setTimeout(function() {
          console.log('We are about to call makernode.rc.redirect with url', data.url, 'port', data.port);
          makernode.rc.redirect(data.url, data.ping_port, data.port);
        }, 1000);
      }, 1000);
    });

    $scope.send_server_update = function(msg_type, d) {
      console.log('sending ' + msg_type);
      console.log(d);
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

    $scope.confirm_dialog = function(text, f) {
      if (confirm(text)) {
        f();
      };
    };
  }
]);

makernode.app.controller('EmptyCtrl', ['$scope',
  function($scope) {}
]);

makernode.app.controller('ConnectingCtrl',
  function($scope, ConnectingService) {
    console.log('Connecting');
    var current = 0;
    var DURATION = 60000; //milliseconds
    var INCREMENT = 200;
    $scope.ssid = ConnectingService.getSSID();
    $scope.bonjourReady = ConnectingService.bonjourReady();

    function getOS() {
      var os = "win";
      if (navigator.appVersion.indexOf("Win") != -1) os = "win";
      else if (navigator.platform.match(/(iPhone|iPod|iPad)/i)) os = "ios";
      else if (navigator.userAgent.match(/Android/i)) os = "android";
      else if (navigator.appVersion.indexOf("Mac") != -1) os = "mac";
      //else if (navigator.appVersion.indexOf("X11") != -1) os = "unix";
      //else if (navigator.appVersion.indexOf("Linux") != -1) os = "linux";
      return os;
    }
    if (!$('.wifi-select-image').children().length) { //TODO: figure out why this gets called twice
      $('.wifi-select-image').append('<img src="/static/img/wifi_select_' + getOS() + '.png" />');
    }

    function updateProgress() {

      current += INCREMENT;
      var percent = 100;
      if (current < DURATION) {
        percent = (current / DURATION) * 100;
        setTimeout(updateProgress, INCREMENT);
      }
      $('.progress-bar').width(percent + '%');
    }
    updateProgress();
  }
);

makernode.app.service('ConnectingService', function() {
  var _ssid;
  var _ready = false;
  this.getSSID = function() {
    return _ssid;
  }
  this.setSSID = function(ssid) {
    _ssid = ssid;
  }
  this.bonjourReady = function() {
    return _ready;
  }
  this.checkBonjour = function() { //TODO: make this work with any hostname. Server should pass down hostname when client starts.
    $.getJSON('http://clanton.local/test_connection', function() {
      _ready = true;
      console.log('bonjour connection verified');
    });
  }
});

//from https://github.com/TheSharpieOne/angular-input-match/blob/master/match.js
makernode.app.directive('match', function() {
  return {
    require: 'ngModel',
    restrict: 'A',
    scope: {
      match: '='
    },
    link: function(scope, elem, attrs, ctrl) {
      scope.$watch(function() {
        var modelValue = ctrl.$modelValue || ctrl.$$invalidModelValue;
        return (ctrl.$pristine && angular.isUndefined(modelValue)) || scope.match === modelValue;
      }, function(currentValue) {
        ctrl.$setValidity('match', currentValue);
      });
    }
  };
});

makernode.app.controller('DashboardCtrl', ['$scope',
  function($scope) {
    function send_service_list_request() {
      if (makernode.rc.currentRouteKey() == 'dashboard') {
        var options = {
          action: 'list'
        };
        console.log('sending service request:');
        console.log(options);
        $scope.send_server_update('dashboard-service', options);
        setTimeout(send_service_list_request, 3000);
      }
    }
    send_service_list_request();
    $scope.send_server_update('dashboard-info');
  }
]);

makernode.app.controller('FormCtrl',
  function($scope, ConnectingService) {
    $scope.form = {};
    var my_route_key = makernode.rc.currentRouteKey();
    var my_route = makernode.routes[my_route_key];
    var my_route_i = makernode.setup_steps.indexOf(my_route_key);
    var next_route_key = ""; //by default, when there is no next step, go home

    if (my_route_i !== -1) {
      next_route_key = makernode.setup_steps[my_route_i + 1];
    }
    next_route = makernode.routes[next_route_key];
    $scope.scan_wifi();
    $scope.submit = function() {
      var combo_value = $('.scombobox-value');
      if (combo_value && combo_value.attr('value')) {
        $scope.form.ssid = combo_value.attr('value');
      } else {
        $scope.form.ssid = $('.scombobox-display').val();
      }
      ConnectingService.setSSID($scope.form.ssid);
      console.log('We are about to go to the next route', next_route.hash);
      makernode.rc.goTo(next_route);
      if (my_route.socket_msg_type) {
        console.log('We are about to send the server a msg of type',
          my_route.socket_msg_type, 'with data',
          JSON.stringify($scope.form, null, 2));
        $scope.send_server_update(my_route.socket_msg_type, $scope.form);
      }
    };
  }
);

makernode.app.controller('InitCtrl', function($scope, ConnectingService) {
  // when we get a reply about what mode we are in,
  // go to the appropriate page
  $scope.ws.on('mode', function(mode) {
    if (mode === 'setup') {
      ConnectingService.checkBonjour();
      makernode.rc.goTo(makernode.routes.set_hostname);
    } else {
      makernode.rc.goTo(makernode.routes.test_pin); //TODO: Go to dashbaord after initial visit to test pin
    }
  });
  // ask what mode we are in
  $scope.ws.emit('mode', {});
});

makernode.app.directive('stepsPics', function($document) {
  function link($scope, $el, attrs) {
    $scope.attrs = attrs; // TODO is this necessary?
    $scope.attrs.step = parseInt(attrs.step);
  }
  return {
    templateUrl: 'templates/steps_pics.html',
    link: link
  };
});

makernode.app.directive('pinButton', function($document) {
  return {
    templateUrl: 'templates/pin_button.html'
  };
});

makernode.app.directive('pinSlider', function($document) {
  return {
    templateUrl: 'templates/pin_slider.html'
  };
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
    var sen = [],
      act = [];
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
          'and so we will overwrite the server info with this.');
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
    var server_pins = makernode.server_pin_format(changed_pins);
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
    if (pin.is_analog && !pin.is_input) // analog out:
      name = '~' + id; // ex. '~3'
    if (pin.is_analog && pin.is_input) // analog in:
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
