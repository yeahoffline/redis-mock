var redismock = require("../");
var should = require("should");
var events = require("events");

if (process.env['VALID_TESTS']) {
  redismock = require('redis');
}

describe("ping", function () {
  it("should return PONG", function (done) {

    var r = redismock.createClient();

    r.ping(function (err, result) {
      result.should.equal("PONG");

      r.end(true);

      done();

    });
  });
});

describe("set", function () {
  it("should set a key", function (done) {

    var r = redismock.createClient();

    r.set("foo", "bar", function (err, result) {
      result.should.equal("OK");

          r.get("foo", function (err, result) {

            result.should.equal("bar");

            r.end(true);

            done();

          });
    });
  });

  it("should allow arrays as first argument to the set function", function (done) {

    var r = redismock.createClient();

    r.set(["foo", "bar"], function (err, result) {
      result.should.equal("OK");

          r.get("foo", function (err, result) {

            result.should.equal("bar");

            r.end(true);

            done();

          });
    });
  });
  it("should allow redis arguments to the set function", function (done) {

    var r = redismock.createClient();

    r.set("foo", "bar", 'EX', 10, function (err, result) {
      result.should.equal("OK");

          r.get("foo", function (err, result) {

            result.should.equal("bar");

            r.end(true);

            done();

          });
    });
  });
  it("should toString() values", function (done) {

    var r = redismock.createClient();

    r.set("foo", {probably_not:'desired'}, function (err, result) {
      result.should.equal("OK");

      r.get("foo", function (err, result) {

        result.should.equal("[object Object]");

        r.end(true);
        done();

      });
    });
  });

  it("should set a key with ex", function (done) {

    var r = redismock.createClient();

    r.set("foo", "bar", "ex", 1, function (err, result) {
      result.should.equal("OK");

          r.get("foo", function (err, result) {

            result.should.equal("bar");

            setTimeout(function () {
              r.exists("foo", function (err, result) {
                result.should.equal(0);
                r.end(true);
                done();
              });
            }, 1100);

          });
    });
  });

  it("should set a key with EX and NX", function (done) {

    var r = redismock.createClient();

    r.set("foo", "bar", "NX", "EX", 1, function (err, result) {
      result.should.equal("OK");

          r.get("foo", function (err, result) {

            result.should.equal("bar");

            setTimeout(function () {
              r.exists("foo", function (err, result) {
                result.should.equal(0);
                r.end(true);
                done();
              });
            }, 1100);

          });
    });
  });

  it("should not set a key with EX and NX", function (done) {

    var r = redismock.createClient();

    r.set("foo", "bar", function (err, result) {
        result.should.equal("OK");

        r.set("foo", "bar", "NX", "EX", 1, function (err, result) {
            (err === null).should.be.true;
            (result === null).should.be.true;

            r.end(true);
            done();

        });
    });
  });

  it("should set a key with px", function (done) {

    var r = redismock.createClient();

    r.set("foo", "bar", "px", 1000, function (err, result) {
      result.should.equal("OK");

      r.get("foo", function (err, result) {

        result.should.equal("bar");

        setTimeout(function () {
          r.exists("foo", function (err, result) {
            result.should.equal(0);
            r.end(true);
            done();
          });
        }, 1100);

      });
    });
  });

  it("should set a key with PX and NX", function (done) {

    var r = redismock.createClient();

    r.set("foo", "bar", "NX", "PX", 1000, function (err, result) {
      result.should.equal("OK");

      r.get("foo", function (err, result) {

        result.should.equal("bar");

        setTimeout(function () {
          r.exists("foo", function (err, result) {
            result.should.equal(0);
            r.end(true);
            done();
          });
        }, 1100);

      });
    });
  });

  it("should not set a key with PX and NX", function (done) {

    var r = redismock.createClient();

    r.set("foo", "bar", function (err, result) {
      result.should.equal("OK");

      r.set("foo", "bar", "NX", "PX", 1000, function (err, result) {
        (err === null).should.be.true;
        (result === null).should.be.true;

        r.end(true);
        done();

      });
    });
  });

});


describe("get", function () {

  it("should return the value of an existing key", function (done) {

    var r = redismock.createClient();

    r.set("foo", "bar", function (err, result) {

      r.get("foo", function (err, result) {

        result.should.equal("bar");

        r.end(true);

        done();

      });
    });
  });

  it("should return null for a non-existing key", function (done) {

    var r = redismock.createClient();


    r.get("does-not-exist", function (err, result) {

      should.not.exist(result);

      r.end(true);

      done();

    });
  });
});

describe("getset", function () {
  var r;

  beforeEach(function () {
    r = redismock.createClient();
  });

  it("should return null for a non-existing key", function (done) {
    r.getset("does-not-exist", "newValue", function (err, result) {
      should.not.exist(result);

      r.end(true);
      done();
    });

  });

  it("should return the value of the key before setting it", function (done) {
    r.set("test-key", "oldValue", function (err, result) {
      r.getset("test-key", "newValue", function (err, result) {
        result.should.equal("oldValue");
        r.get("test-key", function (err, result) {
          result.should.equal("newValue");
          r.end(true);
          done();
        });
      });
    });
  });

  it("should return an error if the key holds the wrong type of value", function (done) {
    r.sadd("test-key", "setMember", function (err, result) {
      result.should.equal(1);
      r.getset("test-key", "newValue", function (err, result) {
        err.message.should.eql("WRONGTYPE Operation against a key holding the wrong kind of value");

        r.end(true);
        done();
      });
    });
  });

});

describe("setex", function () {

  this.timeout(5000);

  var r;

  beforeEach(function () {
    r = redismock.createClient();
  });


  it("should set a key", function (done) {
    var key = 'test_persist';
    r.setex(key, 1000, "val", function (err, result) {
        result.should.equal("OK");
      r.get(key, function (err, result) {
        result.should.equal("val");
        r.end(true);
        done();
      });
    });
  });

  it("should set a disappearing key", function (done) {
    var key = 'test_disappearing'
    r.setex(key, 1, "val", cb)

    function cb(err, result) {
      result.should.be.ok();

      setTimeout(function () {
        r.exists(key, function (err, result) {
          result.should.equal(0);
          r.end(true);
          done();
        });
      }, 2100);
    }
  });

  it("should set a key without a callback involved", function (done) {
    var key = 'test_persist_wo_callback';

    r.setex(key, 1000, "val");

    setTimeout(function () {
      r.get(key, function (err, result) {
        result.should.equal("val");
        r.del(key);
        r.end(true);
        done();
      });
    }, 100)

  });

});

describe("setnx", function () {

  it("should set a key", function (done) {

    var r = redismock.createClient();

    r.setnx("foo", "10", function (err, result) {
        result.should.eql(1);

      r.get("foo", function (err, result) {
        result.should.eql("10");
        r.end(true);
        done();
      });
    });
  });

  it("should not re-set a key", function (done) {

    var r = redismock.createClient();

    r.set("foo", "val", function (err, result) {

      r.setnx("foo", "otherVal", function (err, result) {

        result.should.eql(0);

        r.get("foo", function(err, result) {
            result.should.equal("val");

            r.end(true);
            done();
        });
      });
    });
  });
});

describe("mget", function () {

  it("should fetch multiple values across multiple keys", function (done) {

    var r = redismock.createClient();

    r.mset(["multi1", "one", "multi3", "three"], function (err, result) {
      r.mget("multi1", "multi2", "multi3", function (err, result) {
        result.should.be.ok();

        result[0].should.equal("one");

        should.not.exist(result[1]);

        result[2].should.equal("three");

        r.end(true);
        done();

      });
    });
  });
});

describe("mset", function () {

  it("should set multiple keys at once using an array", function (done) {

    var r = redismock.createClient();

    r.mset(["msetkey1", 1, "msetkey2", 2], function (err, result) {
      result.should.be.eql("OK");

      r.mget(["msetkey1", "msetkey2"], function (err, results) {
        results.should.deepEqual(["1", "2"]);
        r.end(true);
        done();
      });
    });
  });

  it("should set multiple keys at once using arguments", function (done) {

    var r = redismock.createClient();

    r.mset("msetkey1", 3, "msetkey2", 4, function (err, result) {
      result.should.be.eql("OK");

      r.mget(["msetkey1", "msetkey2"], function (err, results) {
        results.should.deepEqual(["3", "4"]);
        r.end(true);
        done();
      });
    });
  });


  it("should fail when passed an array of odd length", function (done) {

    var r = redismock.createClient();

    r.mset(["failkey1", 1, "failkey2"], function (err, result) {
      err.should.be.ok();
      r.end(true);
      done();
    });
  });

  it("should fail when passing no arguments", function (done) {

    var r = redismock.createClient();

    r.mset(function (err, result) {
      err.should.be.ok();
      r.end(true);
      done();
    });
  });

  it("should fail when passing an empty array", function (done) {

    var r = redismock.createClient();

    r.mset([], function (err, result) {
      err.should.be.ok();
      r.end(true);
      done();
    });
  });

});

describe("msetnx", function () {

  it("should be able to set multiple non-existing keys", function (done) {

    var r = redismock.createClient();

    r.msetnx(["msetnxkey1", 1, "msetnxkey2", 2], function (err, result) {
      result.should.be.eql(1);

      r.mget(["msetnxkey1", "msetnxkey2"], function (err, results) {
        results.should.deepEqual(["1", "2"]);
        r.end(true);
        done();
      });
    });
  });

  it("should fail to set any key if a single one exists already", function (done) {

    var r = redismock.createClient();

    r.set("msetnxkey1", 1, function (err, result) {

      r.msetnx(["msetnxkey1", 1, "msetnxkey3", 3], function (err, result) {
        result.should.be.eql(0);

        r.mget(["msetnxkey1", "msetnxkey3"], function (err, results) {
          results.should.deepEqual(["1", null]);
          r.end(true);
          done();
        });
      });
    });
  });

});

describe("incr", function () {

  it("should increment the number stored at key", function (done) {

    var r = redismock.createClient();

    r.set("foo", "10", function (err, result) {

      r.incr("foo", function (err, result) {

        result.should.eql(11);

        r.get("foo", function (err, result) {

          result.should.eql("11");

          r.end(true);
          done();
        });
      });
    });
  });

  it("should set 0 before performing if the key does not exist", function (done) {

    var r = redismock.createClient();

    r.incr("bar", function (err, result) {

      result.should.eql(1);

      r.get("bar", function (err, result) {

        result.should.eql("1");

        r.end(true);
        done();
      });
    });
  });

  it("should return error if the key holds the wrong kind of value.", function (done) {

    var r = redismock.createClient();

    r.hset("foo", "bar", "baz", function (err, result) {

      r.incr("foo", function (err, result) {

        err.message.should.eql("WRONGTYPE Operation against a key holding the wrong kind of value");

        r.end(true);
        done();
      });
    });
  });

  it("should return error if the key contains a string that can not be represented as integer.", function (done) {

    var r = redismock.createClient();

    r.set("baz", "qux", function (err, result) {

      r.incr("baz", function (err, result) {

        err.message.should.equal("ERR value is not an integer or out of range");

        r.end(true);
        done();
      });
    });
  });
});

describe("incrby", function () {

  it("should increment the number stored at key by 2", function (done) {

    var r = redismock.createClient();

    r.set("foo", "10", function (err, result) {

      r.incrby("foo", 2, function (err, result) {

        result.should.eql(12);

        r.get("foo", function (err, result) {

          result.should.eql("12");

          r.end(true);
          done();
        });
      });
    });
  });

  it("should set 0 before performing if the key does not exist", function (done) {

    var r = redismock.createClient();

    r.incrby("bar", 5, function (err, result) {

      result.should.eql(5);

      r.get("bar", function (err, result) {

        result.should.eql("5");

        r.end(true);
        done();
      });
    });
  });

  it("should return error if the key holds the wrong kind of value.", function (done) {

    var r = redismock.createClient();

    r.hset("foo", "bar", "baz", function (err, result) {

      r.incrby("foo", 5, function (err, result) {

        err.message.should.eql("WRONGTYPE Operation against a key holding the wrong kind of value");

        r.end(true);
        done();
      });
    });
  });

  it("should return error if the key contains a string that can not be represented as integer.", function (done) {

    var r = redismock.createClient();

    r.set("baz", "qux", function (err, result) {

      r.incrby("baz", 5, function (err, result) {

        err.message.should.equal("ERR value is not an integer or out of range");

        r.end(true);
        done();
      });
    });
  });
});

describe("incrbyfloat", function () {

  it("should increment the number stored at key by a float value", function (done) {

    var r = redismock.createClient();

    r.set("foo", "1.5", function (err, result) {

      r.incrbyfloat("foo", "0.5", function (err, result) {

        result.should.eql("2");

        r.get("foo", function (err, result) {

          result.should.eql("2");

          r.end(true);
          done();
        });
      });
    });
  });

  it("should set 0 before performing if the key does not exist", function (done) {

    var r = redismock.createClient();

    r.incrbyfloat("bar", "1.5", function (err, result) {
      result.should.eql("1.5");

      r.get("bar", function (err, result) {
        result.should.eql("1.5");

        r.end(true);
        done();
      });
    });
  });

  it("should return error if the key holds the wrong kind of value.", function (done) {

    var r = redismock.createClient();

    r.hset("foo", "bar", "baz", function (err, result) {

      r.incrbyfloat("foo", "1.5", function (err, result) {

        err.message.should.eql("WRONGTYPE Operation against a key holding the wrong kind of value");

        r.end(true);
        done();
      });
    });
  });

  it("should return error if the key contains a string that can not be represented as float.", function (done) {

    var r = redismock.createClient();

    r.set("baz", "qux", function (err, result) {

      r.incrbyfloat("baz", "1.5",function (err, result) {

        err.message.should.equal("ERR value is not a valid float");

        r.end(true);
        done();
      });
    });
  });
});
