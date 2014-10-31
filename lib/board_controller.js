/**
 * @module board_controller
 **/
var log = require('./utils/log')('board_conroller');
var conf = require('./conf')();
var _ = require('underscore');
var Cylon = require('cylon');
var robot;

function board_controller(conf_filename, ws) {

  var state; // board state JSON object, recorded in conf file

  /**
   * Init gpio, and start running the board controller server
   * @method start
   * @param {} cb callback that extecutes when server is done starting.
   * @return void
   */
  var start = function(cb) {
    log.info('Start Board Controller');
    // first read the conf file
    conf.read(conf_filename).then(function(o) {
      state = o;
      log.debug('done reading board state conf file');

      // second initialize IO

      // TODO put this in the galileo on ready callback so it happens
      // after we are able to update the galileo board based on client
      // updates (right now galileo io is broken so that callback never
      // happens, it seems)
      // third start handling websocket stuff that might require
      // updating pins
      ws.on('connection', function(conn) {
        // send client all the pin info
        conn.emit('pins', {
          pins: state.pins
        });

        // client is sending us a pin update
        conn.on('pins', update_pins);

        conn.on('disconnect', function() {
          log.debug('client disconnected');
        });
        init_robot(state);
      });
      log.debug('set up board controller websocket stuff');

      // fourth do the callback from app.js
      log.debug('about to do the on-done-starting callback');
      cb();

    }); // end of conf read then
  }; // end of start

  var init_robot = function(state) {
    var devices = [];
    _.each(state.pins, function(pin, idstr) {
      var id = parseInt(idstr);
      devices.push({
        name: 'pin_' + id,
        driver: 'direct-pin',
        pin: id
      });
    });

    robot = Cylon.robot({
      connection: {
        name: 'galileo',
        adaptor: 'intel-iot'
      },
      devices: devices
    });
    robot.on('ready', function(bot) {
      log.debug(' robot.on(ready, function(');
      robot = bot;
      _.each(state.pins, function(pin, idstr) {
        var id = parseInt(idstr);
        // var mode = pin.is_input ? 'INPUT' : 'OUTPUT';
        // this.pinMode(id, this.modes[mode]);
        // if (pin.is_input) {
        //   var method = pin.is_analog ? 'analog' : 'digital';
        //   robot[id][method + 'Read'](pin_listener(id));
        // }
      });
      log.debug('set up IO');
    });
    robot.on('error', function(err) {
      log.error(err);
    });
    robot.start();
  }

  var broadcast_pin_updates = function(pin_idstrs, msg_id) {
    ws.emit('pins', {
      pins: _.pick(state.pins, pin_idstrs),
      msg_id_processed: msg_id,
    });
  };

  var pin_listener = function(id) {
    //TODO: Will probably need to modify this for cylon...
    return _.throttle(function(id, val) {
      log.debug('Update pins from Galileo IO info id', id, 'val', val);
      var idstr = id.toString();
      if (state.pins[idstr].value === val) {
        return;
      }
      state.pins[idstr].value = val;
      conf.write(conf_filename, state);
      broadcast_pin_updates([idstr], null);
    }, 100);
  };

  // update output pins when client has changed their values
  var update_pins = function(d) {
    log.debug('update pins from client info', JSON.stringify(d, null, 2));
    _.each(d.pins, function(pin, idstr) {
      var id = parseInt(idstr);
      if (state.pins[idstr].value !== pin.value && !pin.is_input) {
        var method = pin.is_analog ? 'analog' : 'digital';
        if (robot) {
          robot['pin_' + id][method + 'Write'](pin.value);
        }
      }
      _.extend(state.pins[idstr], pin);
    });
    conf.write(conf_filename, state);
    broadcast_pin_updates(_.keys(d.pins), d.msg_id);
  };

  /**
   * Stop the board controller server.
   * @method stop
   * @return void CallExpression
   */
  var stop = function() {
    // TODO do we need to stop Galileo IO?
    log.info('Stopping Board Controller');
    return conf.write(conf_filename, state);
  };

  return {
    start: start,
    stop: stop,
  };
};

module.exports = board_controller;
