var Cylon = require('cylon');

Cylon.robot({
	  connection: { name: 'galileo', adaptor: 'intel-iot' },
	  device: {name: 'led', driver: 'led', pin: 13 },

	    work: function(my) {
		        every((1).second(), function() {
				      my.led.toggle();
				          });
			  }
}).start();

