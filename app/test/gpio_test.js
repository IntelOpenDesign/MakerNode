var Galileo = require("galileo-io");
var board = new Galileo();

board.on("ready", function() {
  var byte = 0;
  this.pinMode(13, this.MODES.OUTPUT);

  setInterval(function() {
    board.digitalWrite(13, (byte ^= 1));
  }, 500);
});
