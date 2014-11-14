/** 
 * @module dashboard_controller
 **/

"use strict";
var log = require('./utils/log')('dashboard_controller');
var utils = require('./utils/galileo')();

var SERVICES = ['avahi-daemon', 'connman', 'lighttpd', 'maker-node', 'redis', 'xdk-daemon'];

module.exports = function(conn) {
  function checkService(index, result) {
    if (!result) {
      result = {action: 'list', services: {}};
    }
    if (index < SERVICES.length) {
      utils.is_service_active(SERVICES[index], function(b) {
        result.services[SERVICES[index]] = b;
        checkService(index + 1, result);
      });
    } else {
      conn.emit('dashboard-service', result);
    }
  }

  function toggleService(name, action, callback) {

    conn.emit('dashboard-service', {
      id: name,
      action: action,
      status: 'begin'
    });
    var f = (action == 'stop' ? utils.stop_service : utils.start_service);
    f(name, function() {
      conn.emit('dashboard-service', {
        id: name,
        action: action,
        status: 'end'
      });
      callback ? callback() : null;
    });

  }

  conn.on('dashboard-command', function(d) {
    log.debug('dashboard-command: ', d);
    switch (d.action) {
      case 'reboot':
        utils.reboot();
        break;
      case 'install_updates':
        utils.install_updates();
        break;
      case 'setup':
        utils.stop_supplicant();
        break;
    }
  });

  conn.on('dashboard-info', function(d) {
    var result = {};
    utils.get_hostname(function(error, hostname) {
      result.hostname = hostname;
      utils.get_mac_address(function(mac) {
        result.mac = mac;
        utils.is_online(function(b) {
          result.online = b;
          utils.get_ip_address('wlp1s0', function(ip) {
            if (ip) {
              result.ip = ip + ' (wifi wlp1s0)';
              conn.emit('dashboard-info', result);
            }
            else {
              utils.get_ip_address('enp0s20f6', function(ip2) {
                if (ip2) {
                  result.ip = ip2 + ' (wired enp0s20f6)';
                }
                conn.emit('dashboard-info', result);
              });
            }
          });
        });
      });
    });
  });

  conn.on('dashboard-service', function(d) {
    switch (d.action) {
      case 'list':
        checkService(0);
        break;
      case 'stop':
      case 'start':
        toggleService(d.name, d.action);
        break;
      case 'restart':
        toggleService(d.name, 'stop', function() {
          toggleService(d.name, 'start');
        });
        break;
      default:
        break;
    }
  });
  return {};
}
