var Galileo = require("galileo-io");
var board = new Galileo();
var pin = 13;
if (process.argv.length > 2) {
  pin = process.argv[2];
}

board.on("ready", function() {
  var byte = 0;
  this.pinMode(pin, this.MODES.OUTPUT);

  setInterval(function() {
    board.digitalWrite(pin, (byte ^= 1));
  }, 500);
});
