/** 
 * @module dashboard_controller
 **/

"use strict";
var log = require('maker-node-utils/log')('dashboard_controller');
var utils = require('maker-node-utils/galileo')();

var SERVICES = ['avahi-daemon', 'connman', 'lighttpd', 'maker-node', 'redis', 'wyliodrin', 'xdk-daemon'];

module.exports = function(conn) {
  function checkService(index) {
    var result = {};
    if (index < SERVICES.length) {
      utils.is_service_active(SERVICES[index], function(b) {
        result[SERVICES[index]] = b;
        index++;
        checkService(index);
      });
    } else {
      log.info(result);
      conn.emit('services', result);
    }
  }


  conn.on('service', function(d) {
    if (d.action == 'list') {
      checkService(0);
    } else if (d.action == 'stop') {
      util.stop_service(d.name, function() {
        log.debug(d.name + ' service stopped');
      });
    } else if (d.action == 'start') {
      util.start_service(d.name, function() {
        log.debug(d.name + ' service started');
      });
    } else if (d.action == 'restart') {
      //TODO
    }
  });


  return {};


}
