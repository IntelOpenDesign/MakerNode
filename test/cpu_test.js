// var Galileo = require('galileo-io');
function test() {
	console.log('test');
	setTimeout(test, 3000);
}
test();
