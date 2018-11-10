var helpers = require("./helpers");
var should = require("should");

var r;

beforeEach(function () {
  r = helpers.createClient();
});

afterEach(function (done) {
  r.flushall();
  r.quit(done);
});

describe("select", function() {
  it("should change database with using an integer", function(done) {
    r.select(2, function(err, result) {
      should.not.exist(err);
      result.should.equal('OK');

      done();
    });

  });

  it('should error when using and invalid database value', function(done) {
    r.select('db', function(err, result) {
      should.not.exist(result);
      should(err).Error;

      done();
    });
  });

  it('should error when using and invalid database index', function(done) {
    r.select(1000, function(err, result) {
      should.not.exist(result);
      should(err).Error;

      done();
    });
  });

  it('should not ensist on a callback', function() {
    r.select(3);
  });

});
