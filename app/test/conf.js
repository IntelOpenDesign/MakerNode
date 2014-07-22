var fs = require('fs');
var conf = require('../lib/conf').create();
var chai = require('chai'),
  should = chai.should(),
  expect = chai.expect;
var READ_FILE = 'foo.temp';
var WRITE_FILE = '';
var rand = Math.random();

//First, delete file.
function deleteFile() {
fs.unlink(READ_FILE, function(err) {
  if (err) throw err;
});
}

describe('Conf.write()', function() {
  deleteFile();
  it('* Writes  ' + WRITE_FILE, function(done) {
    // fs.createReadStream(READ_FILE).pipe(fs.createWriteStream(READ_FILE + '.temp'));
    conf.write('foo.txt', JSON.stringify({
      test: 'pass'
    }))
      .then(
        function(state) {
          done();

          describe('Conf.read()', function() {
            it('* Reads valid JSON from ' + READ_FILE, function(done) {
              conf.read(READ_FILE)
                .then(
                  function(state) {
                    state.should.have.property('test', 'pass');
                    done();
                    deleteFile();
                  },
                  function(reason) {
                    throw ('read error: ' + reason);
                  }
              )
            });
          });
        },
        function(reason) {
          throw ('write error: ' + reason);
        }
    )
  });
});
