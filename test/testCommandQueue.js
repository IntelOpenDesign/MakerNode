var utils = require('maker-node-utils/galileo')();
var sh = require('maker-node-utils/command_queue')();
utils.stop_service('connman', function() {
console.log('stopped connman');
	utils.start_access_point(function() {
		console.log('set up ap');
utils.set_hostname('rrr', function() {
// utils.get_hostname(function(err, stdout, stderr) {
// console.log(err + ' ' + stdout + ' ');	
	console.log('ok');
// });
});
});
});
