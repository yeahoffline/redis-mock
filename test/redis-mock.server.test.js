var should = require("should");
var helpers = require("./helpers");

var r;

beforeEach(function () {
  r = helpers.createClient();
});

afterEach(function (done) {
  r.flushall();
  r.quit(done);
});

describe("flushdb", function () {

  it("should clean database", function (done) {

    r.set("foo", "bar", function (err, result) {
      r.flushdb(function (err, result) {
        result.should.equal("OK");

        r.exists("foo", function (err, result) {

          result.should.be.equal(0);

          done();
        });

      });

    });

  });

});

describe("auth", function () {
  it("should always succeed and call back", function (done) {
    r.auth("secret", function (err, result) {
      result.should.equal('OK');
      done();
    });
  });
});
