"use strict";
var sh = require('./command_queue')();
var log = require('./log')('galileo');
var express = require('express');
var socketio = require('socket.io');
var fs = require('fs');


/**
 * @constructor galileo
 **/
module.exports = function() {

  function start_service(name, callback) {
    sh('systemctl start ' + name, callback);
  }

  function stop_service(name, callback) {
    sh('systemctl stop ' + name, callback);
  }

  function is_service_active(name, callback) {
    sh('systemctl is-active ' + name, function(error, stdout, stderr) {
      	    callback(stdout.indexOf('inactive') === -1);
    });
  }

  function get_mac_address(callback) {
    sh("ifconfig | grep -o -m 1 'HWaddr[^\n]*'", function(error, stdout, stderr) {

      var result = null;
      if (stdout) {
        result = stdout.split(' ');
        result = result[1].split(':').join('');

      }
      callback(result);
    });

  }

  function set_ap_host_name(callback) {
    get_mac_address(function(address) {
      if (address) {
        sh("sed -i 's/ssid=.*/ssid=MakerNode-" + address.substring(address.length - 5) + "/' /etc/hostapd.conf", callback);
      } else {
        log.error('Could not get mac address. Maybe networking is disabled..?');
        callback();
      }
    });
  }

  var cached_wifi_network_list = null;

  function list_wifi_networks(callback) {
    log.debug('client is asking what wifi networks are available');
    sh("iwlist wlp1s0 scan | grep 'ESSID'",
      function(error, stdout, stderr) {
        if (!error) {
          stdout = remove_extra_spaces(stdout);
          stdout = stdout.replace(/ESSID:/g, '');
          stdout = stdout.replace(/\"/g, '');
          cached_wifi_network_list = stdout.split(' ');
        }
        callback(cached_wifi_network_list);
      }
    );
  }

  function get_wifi_key(ssid, callback) {
    sh("connmanctl services",
      function(error, stdout, stderr) {
        console.log('Match ' + ssid + ' in ' + stdout);
        stdout = remove_extra_spaces(stdout);
        var a = stdout.split(' ');
        for (var i = 0; i < a.length; i++) {
          if (a[i] == ssid) {
            callback(a[i + 1]);
          }
        }
        callback(null);
      });

  }

  function remove_extra_spaces(string) {
      return string.replace(/\s+/g, ' ').trim();
    }
    /**
     * Description
     * @memberOf galileo
     * @method start_access_point
     * @param {} callback
     * @return void
     */

  function start_access_point(callback) {
    set_ap_host_name(function() {
      stop_service('connman', function() {
        require('child_process').exec('./startAP.sh'); //Not sure why this sometimes fails to call back 
        //TODO: Consider breaking up startAP.sh into discrete sh() calls...
        callback();
        // sh('./startAP.sh', callback);
      });
    });
  }

  /**
   * Description
   * @memberOf galileo
   * @method stop_access_point
   * @param {} callback
   * @return void
   */
  function stop_access_point(callback) {
    sh('killall hostapd', callback);
  }

  /**
   * Description
   * @method start_supplicant
   * @memberOf galileo
   * @param {} options
   * @param {} callback
   * @return void
   */
  function start_supplicant(options, callback) {
    var data = '';
    data += '[service_null123]\n';
    data += 'Type = wifi\n';
    data += 'Security = wpa2\n';
    data += 'Name = ' + options.ssid + '\n';
    data += 'Passphrase = ' + options.pwd + '\n';

    fs.writeFile('/var/lib/connman/wifi.config', data, function(err) {
      if (err) {
        console.log(err);
      } else {
        start_service('connman', callback);
      };
    });
  }

  // TODO stop_supplicant does more than just stop the wifi connection.
  // it also resets us to setup mode! this is not a well named function
  /**
   * Description
   * @memberOf galileo
   * @method stop_supplicant
   * @param {} callback
   * @return void
   */
  function stop_supplicant(callback) {
    sh('./restore_factory_settings.sh', callback);
  }

  /**
   * Description
   * @memberOf galileo
   * @method get_hostname
   * @param {} callback
   * @return void
   */
  function get_hostname(callback) {
    sh('hostname', callback);
  }

  /**
   * Description
   * @method set_hostname
   * @memberOf galileo
   * @param {} name
   * @param {} callback
   * @return void
   */
  function set_hostname(name, callback) {
    sh('sh/set_hostname.sh ' + name, callback);
  }

  /**
   * Description
   * @memberOf galileo
   * @method set_root_password
   * @param {} pwd
   * @param {} callback
   * @return void
   */
  function set_root_password(pwd, callback) {
    // Steve's configure_edison.py commands for changing the password
    // def changePassword(newPass):
    //   os.popen('echo "root":"%s" | chpasswd' % newPass)
    //   os.popen("sed -i 's/^wpa_passphrase=.*/wpa_passphrase=%s/' /etc/hostapd/hostapd.conf" % (newPass))
    sh('echo root:' + pwd + ' | chpasswd', callback);
  }

  /**
   * Description
   * @memberOf galileo
   * @method create_servers
   * @param {} port
   * @param {} client_path
   * @return ObjectExpression
   */
  function create_servers(port, client_path) { //TODO: refactor so this takes callback; need to stop connman here
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
    get_wifi_key: get_wifi_key,
    list_wifi_networks: list_wifi_networks,
    start_service: start_service,
    stop_service: stop_service,
    is_service_active: is_service_active,
    start_access_point: start_access_point,
    stop_access_point: stop_access_point,
    start_supplicant: start_supplicant,
    stop_supplicant: stop_supplicant,
    get_hostname: get_hostname,
    set_hostname: set_hostname,
    set_root_password: set_root_password,
    create_servers: create_servers,
    get_mac_address: get_mac_address
  };
}
