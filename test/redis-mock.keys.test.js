var redismock = require("../")
var should = require("should")
var events = require("events");

if (process.env['VALID_TESTS']) {
  redismock = require('redis');
}

describe("del", function () {

  it("should do nothing with non-existant keys", function (done) {
    var r = redismock.createClient();
    r.del(["key1", "key2", "key3"], function (err, result) {
      result.should.equal(0);
      r.del("key4", function (err, result) {
        result.should.equal(0);
        r.end();
        done();
      });
    });
  });

  it("should delete existing keys", function (done) {
    var r = redismock.createClient();
    r.set("test", "test", function (err, result) {
      r.del("test", function (err, result) {
        result.should.equal(1);
        r.get("test", function (err, result) {
          should.not.exist(result);
          r.end();
          done();
        });
      });
    });
  });

  it("should delete multiple keys", function (done) {
    var r = redismock.createClient();
    r.set("test", "val", function (err, result) {
      r.set("test2", "val2", function (err, result) {
        r.del(["test", "test2", "noexistant"], function (err, result) {
          result.should.equal(2);
          r.end();
          done();
        });
      });
    });
  });

});

describe("exists", function () {

  it("should return 0 for non-existing keys", function (done) {

    var r = redismock.createClient();

    r.exists("test", function (err, result) {

      result.should.equal(0);

      r.end();

      done();

    });
  });

  it("should return 1 for existing keys", function (done) {

    var r = redismock.createClient();

    r.set("test", "test", function (err, result) {

      r.exists("test", function (err, result) {

        result.should.equal(1);

        r.del("test");

        r.end();

        done();

      });

    });

  });

});

describe("expire", function () {

  it("should return 0 for non-existing key", function (done) {
    var r = redismock.createClient();
    r.expire("test", 10, function (err, result) {
      result.should.equal(0);
      r.end();
      done();
    });
  });

  it("should return 1 when timeout set on existing key", function (done) {
    var r = redismock.createClient();
    r.set("test", "test", function (err, result) {
      r.expire("test", 10, function (err, result) {
        result.should.equal(1);
        r.del("test");
        r.end();
        done();
      });
    });
  });

  it("should make key disappear after the set time", function (done) {
    var r = redismock.createClient();
    r.set("test", "val", function (err, result) {
      r.expire("test", 1, function (err, result) {
        result.should.equal(1);
        setTimeout(function () {
          r.exists("test", function (err, result) {
            result.should.equal(0);
            r.end();
            done();
          });
        }, 1500);
      });
    });
  });

  it("accepts timeouts exceeding 2**31 msec", function (done) {
    var r = redismock.createClient();
    r.set("test_exceeds", "val", function (err, result) {
      r.expire("test_exceeds", 86400*31 /* one month */, function (err, result) {
        result.should.equal(1);
        setTimeout(function () {
          r.exists("test_exceeds", function (err, result) {
            result.should.equal(1);
            r.end();
            done();
          });
        }, 1000);
      });
    });
  });

});

describe("ttl", function () {

  var r;

  beforeEach(function () {
    r = redismock.createClient();
  });

  it("should return within expire seconds", function (done) {

    r.set("test", "test", function (err, result) {

      r.expire("test", 100, function (err, result) {

        result.should.equal(1);

        setTimeout(function () {
          r.ttl("test", function (err, ttl) {
            if (err) {
              done(err);
            }

            ttl.should.be.within(1, 99);

            r.del("test");

            r.end();

            done();
          });
        }, 1500);
      });

    });

  });

  it("should return -2 for non-existing key", function (done) {

    r.ttl("test", function (err, ttl) {
      if (err) {
        done(err);
      }

      ttl.should.equal(-2);

      r.end();

      done();
    });
  });

  it("should return -1 for an existing key with no EXPIRE", function (done) {

    r.set("test", "test", function (err, result) {
      r.ttl("test", function (err, ttl) {
        if (err) {
          done(err);
        }

        ttl.should.equal(-1);

        r.del("test");

        r.end();

        done();
      });
    });
  });

});

describe("keys", function () {

  var r = redismock.createClient();
  beforeEach(function (done) {
    r.set("hello", "test", function () {
      r.set("hallo", "test", function () {
        r.set("hxlo", "test", done);
      });
    });

  });

  it("should return all existing keys if pattern equal - *", function (done) {
    r.keys('*', function (err, keys) {
      keys.should.be.instanceof(Array);
      keys.should.have.length(3);
      keys.should.containEql('hello');
      keys.should.containEql('hallo');
      keys.should.containEql('hxlo');

      done();
    });
  });

  it("should correct process pattern with '?'", function (done) {
    r.keys('h?llo', function (err, keys) {
      keys.should.be.instanceof(Array);
      keys.should.have.length(2);
      keys.should.containEql('hello');
      keys.should.containEql('hallo');
      
      done();
    });
  });

  it("should correct process pattern with character sets", function (done) {
    r.keys('h[ae]llo', function (err, keys) {
      keys.should.be.instanceof(Array);
      keys.should.have.length(2);
      keys.should.containEql('hello');
      keys.should.containEql('hallo');

      done();
    });
  });

  it("should correct process pattern with all special characters", function (done) {
    r.keys('?[aex]*o', function (err, keys) {
      keys.should.be.instanceof(Array);
      keys.should.have.length(3);
      keys.should.containEql('hello');
      keys.should.containEql('hallo');
      keys.should.containEql('hxlo');
      
      done();
    });
  });
});
