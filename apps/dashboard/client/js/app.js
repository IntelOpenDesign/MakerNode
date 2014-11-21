var gDashboardTooltips = {
  'avahi-daemon': "Networking system that allows discovery of your board via [hostname].local address. A.K.A. Bonjour",
  'bluetooth': "Blutooth wireless services.",
  'connman': "Network manager. Warning: stopping Connman may make your device inaccessible over the network.",
  'lighttpd': "Web server used by IoT Dev Kit",
  'maker-node': "Node JS server for setting up and managing your device.",
  'redis': "Key-value store used by IoT Dev Kit",
  'xdk-daemon': "Server used by IoT Dev Kit"
};

var send_server_update;

$(function() {
  var ws;
  ws = io();
  ws.on('connect', function() {
    console.log('connected to websocket');
  });

  ws.on('dashboard-service', function(data) {
    if (data.action == 'list') {
      function getServiceClick(name, action) {
        return function() {
          send_server_update('dashboard-service', {
            name: name,
            action: action
          });
        }
      }
      _.each(data.services, function(value, key) {
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

  //TODO: Modify this so we are not looking for hard-coded fields, and can display any dynamic status data from server.
  ws.on('dashboard-info', function(data) {
    console.log('got dashboard-info');
    console.log(data);
    $('#node_version').text(data.node_version);
    $('#mraa_version').text(data.mraa_version);
    $('#ip_address').text(data.ip);
    $('#host_name').text(data.hostname);
    $('#mac_address').text(data.mac);
    $('#online').text(data.online ? 'yes' : 'no');
  });

  send_server_update = function(msg_type, d) {
    console.log('sending ' + msg_type);
    console.log(d);
    ws.emit(msg_type, d);
  };

  function send_service_list_request() {
    var options = {
      action: 'list'
    };
    console.log('sending service request:');
    console.log(options);
    send_server_update('dashboard-service', options);
    setTimeout(send_service_list_request, 3000);
  }
  send_service_list_request();
  send_server_update('dashboard-info');

  $('.btn-toggle').click(function() {
    $(this).find('.btn').toggleClass('active');

    if ($(this).find('.btn-primary').size() > 0) {
      $(this).find('.btn').toggleClass('btn-primary');
    }
    if ($(this).find('.btn-danger').size() > 0) {
      $(this).find('.btn').toggleClass('btn-danger');
    }
    if ($(this).find('.btn-success').size() > 0) {
      $(this).find('.btn').toggleClass('btn-success');
    }
    if ($(this).find('.btn-info').size() > 0) {
      $(this).find('.btn').toggleClass('btn-info');
    }
    $(this).find('.btn').toggleClass('btn-default');
  });

});
