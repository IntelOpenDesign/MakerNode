"use strict";
var sh = require('./command_queue')();
var express = require('express');
var socketio = require('socket.io');

var log = require('./log')('galileo_utils');

module.exports = function() {
  function start_access_point(callback) {
    sh('./startAP.sh', callback);
  }

  function stop_access_point(callback) {
    sh('killall hostapd', callback);
  }

  function start_supplicant(options, callback) {
    var command = './init_supplicant.sh ' + options.ssid + ' ' + options.pwd;
    if (options.gateway_ip && options.static_ip) {
      command += ' ' + options.static_ip + ' ' + options.gateway_ip;
    }
    sh(command, callback);
  }

// TODO stop_supplicant does more than just stop the wifi connection.
// it also resets us to setup mode! this is not a well named function
  function stop_supplicant(callback) {
    sh('./restore_factory_settings.sh', callback);
  }

  function get_hostname(callback) {
    sh('hostname', callback);
  }

  function set_hostname(name, callback) {
    sh('./set_hostname.sh ' + name, callback);
  }

  function set_root_password(pwd, callback) {
    // Steve's configure_edison.py commands for changing the password
    // def changePassword(newPass):
    //   os.popen('echo "root":"%s" | chpasswd' % newPass)
    //   os.popen("sed -i 's/^wpa_passphrase=.*/wpa_passphrase=%s/' /etc/hostapd/hostapd.conf" % (newPass))
    sh('echo root:' + pwd + ' | chpasswd', callback);
  }

  function create_servers(port, client_path) {
    var express_app = express();
    if (client_path) {
      express_app.use(express.static(client_path));
    }
    var express_server = express_app.listen(port);
    var socketio_server = socketio.listen(express_server);

    return {
      express_app: express_app,
      express_server: express_server,
      socketio_server: socketio_server
    }
  }

  return {
    start_access_point: start_access_point,
    stop_access_point: stop_access_point,
    start_supplicant: start_supplicant,
    stop_supplicant: stop_supplicant,
    get_hostname: get_hostname,
    set_hostname: set_hostname,
    set_root_password: set_root_password,
    create_servers: create_servers
  };
}
