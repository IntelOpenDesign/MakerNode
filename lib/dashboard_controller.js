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
      log.info(result);
      conn.emit('services', result);
    }
  }

  conn.on('dash-command', function(d) {
    log.debug('dash-command: ', d);
  });

  conn.on('dash-info', function(d) {
    log.debug('dash-info: ', d);
  });

  conn.on('service', function(d) {
    log.debug('service', d);
    switch (d.action) {
      case 'list':
        checkService(0);
        break;
      case 'stop':
        util.stop_service(d.name, function() {
          log.debug(d.name + ' service stopped');
        });
        break;
      case 'start':
        util.start_service(d.name, function() {
          log.debug(d.name + ' service started');
        });
        break;
      case 'restart':
        break;
      default:
        break;
    }
  });


  return {};


}
