var http = require('../lib/http')();

var chai = require('chai'),
  should = chai.should(),
  expect = chai.expect;



describe('HTTP', function() {
  http.listen(1234);
  describe('#listen()', function() {
    it('should load valid index.html', function(done) {
      require('http').request({
          host: '0.0.0.0',
          port: '1234'
        },
        function(response) {
          var str = '';
          response.on('data', function(chunk) {
            str += chunk;
          });
          response.on('end', function() {
            expect(str).to.have.string('<!DOCTYPE html>');
            done();
          });
        }
      ).end();
    });
  });
});
//expect(http.close).to.throw(err);
