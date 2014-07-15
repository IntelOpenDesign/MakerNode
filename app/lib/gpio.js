var log = require('./log').create('GPIO');
var Galileo = require("galileo-io");
var Q = require('q');
var _ = require('underscore');
var board;
var OUTPUT_SCALE = 255;

// REFACTOR_IDEA put reading and writing boardstate.conf in this file too, then it's OK to have some application-specific logic in here, then we can rename this from gpio (which sounds like a minimal wrapper to me) to something like BoardState

function GPIO() {}

GPIO.prototype.init = init;
GPIO.prototype.refreshOutputs = refreshOutputs;

module.exports = function(){
  return new GPIO();
}

function init(onInput) {
    log.debug('init gpio');
    var deferred = Q.defer();
    board = new Galileo();
    board.on("ready", function() {
        log.info("BOARD READY");
        var byte = 0;
        // REFACTOR_IDEA why do we only do this for pin 9?
        this.pinMode(9, this.MODES.OUTPUT);
        board.analogRead('A0', function(data) {
            onInput(14, data);
        });
        board.analogRead('A1', function(data) {
            onInput(15, data);
        });
        board.analogRead('A2', function(data) {
            onInput(16, data);
        });
        board.analogRead('A3', function(data) {
            onInput(17, data);
        });
        board.analogRead('A4', function(data) {
            onInput(18, data);
        });
        board.analogRead('A5', function(data) {
            onInput(19, data);
        });
        //TODO: Figure out why bind wasn't working here. :/
        deferred.resolve(board);
    });
    board.on('error', function(reason) {
        deferred.reject(reason);
    });
    return deferred.promise;
}

var cachedPinValues = [];

// REFACTOR_IDEA the name of this function makes me think it is for output pins only, when really it is for all pins
function refreshOutputs(model) {
    // REFACTOR_IDEA right now we don't have connections in MakerNode. so let's just take out all the connections stuff
    // REFACTOR_IDEA right nowe we don't have the feature of scaling values in MakerNode. so let's take all that out
    _.each(model.connections,
        function(connection) {
            var source = connection.source;
            var target = connection.target;
            //console.log(source + "->" + target + " value=" + model.pins[target].value );
            model.pins[target].value = model.pins[source].value;
        }
        //TODO: AND values for multiple inputs
    );

    var i = 0;
    _.each(model.pins,
        function(pin) {
            var scaledValue;
            if (pin.is_analog) {
                scaledValue = Math.round(pin.value * OUTPUT_SCALE)
            } else {
              //TODO: No, need to read min/max from input pin
                var threshold = pin.input_min + (pin.input_max - pin.input_min) / 2;
                scaledValue = pin.value < threshold ? 0 : OUTPUT_SCALE;
            }
            if (pin.is_inverted) {
              scaledValue = 255 - scaledValue;
            }
            if (!pin.is_input && cachedPinValues[i] != scaledValue) {
                log.debug("Changed pin=" + i + " oldValue=" + cachedPinValues[i] + " newValue=" + scaledValue);
                write(pin, i, scaledValue);
            }
            cachedPinValues[i] = scaledValue;
            i++;
        }
    );
}

function write(pin, pinIndex, scaledValue) {
    pin.is_analog ? board.analogWrite(pinIndex, scaledValue) : board.digitalWrite(pinIndex, scaledValue);

}
