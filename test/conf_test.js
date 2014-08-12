var fs = require('fs');
var conf = require('../lib/conf')();
var chai = require('chai'),
  should = chai.should();
var FILE = 'foo.temp';

//First, delete file.
function deleteFile() {
  fs.unlink(FILE, function(err) {
    if (err) throw err;
  });
}

describe('Conf.write()', function() {
  deleteFile();
  it('* Writes  ' + FILE, function(done) {
    conf.write(FILE, {
      test: 'pass'
    })
      .then(
        function(state) {
          done();

          describe('Conf.read()', function() {
            it('* Reads valid JSON from ' + FILE, function(done) {
              conf.read(FILE)
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
