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
      result = {};
    }
    if (index < SERVICES.length) {
      utils.is_service_active(SERVICES[index], function(b) {
        result[SERVICES[index]] = b;
        checkService(index + 1, result);
      });
    } else {
      conn.emit('dashboard-service', result);
    }
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
    utils.get_hostname(function(error, hostname) {
      utils.get_mac_address(function(mac) {
        utils.get_ip_address(function(ip) {
          var result = {
            hostname: hostname,
            ip: ip,
            mac: mac
          };
          conn.emit('dashboard-info', result);
          log.debug('dash-info: ', result);
        });
      });
    });
  });

  conn.on('dashboard-service', function(d) {
    log.debug('service', d);
    switch (d.action) {
      case 'list':
        checkService(0);
        break;
      case 'stop':
        utils.stop_service(d.name, function() {
          log.debug(d.name + ' service stopped');
        });
        break;
      case 'start':
        utils.start_service(d.name, function() {
          log.debug(d.name + ' service started');
        });
        break;
      case 'restart':
        utils.stop_service(d.name, function() {
          utils.start_service(d.name, function() {
            log.debug(d.name + ' service stopped');
          });
        });

        break;
      default:
        break;
    }
  });


  return {};


}
