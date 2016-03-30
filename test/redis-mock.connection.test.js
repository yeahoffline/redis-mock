var redismock = require("../"),
  should = require("should");

if (process.env['VALID_TESTS']) {
  redismock = require('redis');
}

describe("select", function() {
  it("should change database with using an integer", function(done) {
    var r = redismock.createClient();

    r.select(2, function(err, result) {
      should.not.exist(err);
      result.should.equal('OK');

      r.end();
      done();
    });
    
  });
  
  it('should error when using and invalid database value', function(done) {
    var r = redismock.createClient();

    r.select('db', function(err, result) {
      should.not.exist(result);
      should(err).Error;

      r.end();
      done();
    }); 
  });
}); 