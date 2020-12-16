var should = require("should");
var helpers = require("../helpers");

var r;

beforeEach(function () {
  r = helpers.createClient();
});

afterEach(function (done) {
  r.flushall();
  r.quit(done);
});

describe("auth", function () {
  if (process.env.VALID_TESTS) {

    it("should always succeed and call back", function (done) {
      r.auth("secret", function (err, result) {
        err.message.should.match(/ERR AUTH <password> called without any password configured for the default user/)
        done();
      });
    });

  } else {
    //this doesn't work with VALID_TESTS unless you preconfigure your redis to use password
    it("should always succeed and call back", function (done) {
      r.auth("secret", function (err, result) {
        result.should.equal('OK');
        done();
      });
    });

  }
});

describe("select", function () {
  it("should change the currently selected database", function (done) {
    r.select(0, function (err, result) {
      result.should.be.equal('OK');
      r.set("a", "1", function (err, result) {
        r.select(1, function (err, result) {
          result.should.be.equal('OK');
          r.exists("a", function (err, result) {
            result.should.be.equal(0);
            r.select(0, function (err, result) {
              result.should.be.equal('OK');
              r.get("a", function (err, result) {
                result.should.be.equal("1");
                done();
              });
            });
          });
        });
      });
    });
  });

  it("should throw an error when given an invalid database index", function (done) {
    r.select(17, function (err, result) {
      should.exist(err);
      done();
    });
  });
});

describe("flushdb", function () {

  it("should clean the current database", function (done) {

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

  it("should leave other databases intact", function (done) {
    r.select(0, function (err, result) {
      r.set("a", "1", function (err, result) {
        r.select(3, function (err, result) {
          r.flushdb(function (err, result) {
            r.select(0, function (err, result) {
              r.get("a", function (err, result) {
                result.should.be.equal("1");
                done();
              })
            });
          });
        });
      });
    });
  });
});
