var should = require("should");
var events = require("events");
var helpers = require("./helpers");

var r;

beforeEach(function () {
  r = helpers.createClient();
});

afterEach(function () {
  r.flushall();
});


describe("ping", function () {
  it("should return PONG", function (done) {

    r.ping(function (err, result) {
      result.should.equal("PONG");

      done();

    });
  });
});

describe("set", function () {
  it("should set a key", function (done) {

    r.set("foo", "bar", function (err, result) {
      result.should.equal("OK");

          r.get("foo", function (err, result) {

            result.should.equal("bar");

            done();

          });
    });
  });

  it("should allow buffers as second argument to the set function", function (done) {
    r.set("foo", new Buffer("bar"), function (err, result) {
      (err === null).should.be.true;
      (result instanceof Buffer).should.be.true;
      result.toString().should.equal("OK");
      done();
    });
  });

  it("should allow arrays as first argument to the set function", function (done) {

    r.set(["foo", "bar"], function (err, result) {
      result.should.equal("OK");

          r.get("foo", function (err, result) {

            result.should.equal("bar");

            done();

          });
    });
  });

  it("should allow redis arguments to the set function", function (done) {

    r.set("foo", "bar", 'EX', 10, function (err, result) {
      result.should.equal("OK");

          r.get("foo", function (err, result) {

            result.should.equal("bar");

            done();

          });
    });
  });

  it("should call toString() on non-buffer, non-string values", function (done) {

    r.set("foo", {probably_not:'desired'}, function (err, result) {
      result.should.equal("OK");

      r.get("foo", function (err, result) {

        result.should.equal("[object Object]");

        done();

      });
    });
  });

  it("should set a key with ex", function (done) {

    r.set("foo", "bar", "ex", 1, function (err, result) {
      result.should.equal("OK");

          r.get("foo", function (err, result) {

            result.should.equal("bar");

            setTimeout(function () {
              r.exists("foo", function (err, result) {
                result.should.equal(0);
                done();
              });
            }, 1100);

          });
    });
  });

  it("should set a key with EX and NX", function (done) {

    r.set("foo", "bar", "NX", "EX", 1, function (err, result) {
      result.should.equal("OK");

          r.get("foo", function (err, result) {

            result.should.equal("bar");

            setTimeout(function () {
              r.exists("foo", function (err, result) {
                result.should.equal(0);
                done();
              });
            }, 1100);

          });
    });
  });

  it("should not set a key with EX and NX", function (done) {

    r.set("foo", "bar", function (err, result) {
        result.should.equal("OK");

        r.set("foo", "bar", "NX", "EX", 1, function (err, result) {
            (err === null).should.be.true;
            (result === null).should.be.true;

            done();

        });
    });
  });

  it("should set a key with px", function (done) {

    r.set("foo", "bar", "px", 1000, function (err, result) {
      result.should.equal("OK");

      r.get("foo", function (err, result) {

        result.should.equal("bar");

        setTimeout(function () {
          r.exists("foo", function (err, result) {
            result.should.equal(0);
            done();
          });
        }, 1100);

      });
    });
  });

  it("should set a key with PX and NX", function (done) {

    r.set("foo", "bar", "NX", "PX", 1000, function (err, result) {
      result.should.equal("OK");

      r.get("foo", function (err, result) {

        result.should.equal("bar");

        setTimeout(function () {
          r.exists("foo", function (err, result) {
            result.should.equal(0);
            done();
          });
        }, 1100);

      });
    });
  });

  it("should not set a key with PX and NX", function (done) {

    r.set("foo", "bar", function (err, result) {
      result.should.equal("OK");

      r.set("foo", "bar", "NX", "PX", 1000, function (err, result) {
        (err === null).should.be.true;
        (result === null).should.be.true;

        done();

      });
    });
  });

});


describe("get", function () {
  it("should return the value of an existing key", function (done) {

    r.set("foo", "bar", function (err, result) {

      r.get("foo", function (err, result) {

        result.should.equal("bar");

        done();

      });
    });
  });

  it("should return buffer if we use a buffer for the key", function (done) {

    r.set("foo", "bar", function (err, result) {

      r.get(new Buffer("foo"), function (err, result) {

        (result instanceof Buffer).should.be.true;
        result.toString().should.equal("bar");

        done();

      });
    });
  });

  it("should return string even for buffer value if we use a string for the key", function (done) {

    r.set("foo", new Buffer("bar"), function (err, result) {

      r.get("foo", function (err, result) {

        (result instanceof Buffer).should.be.false;
        result.should.equal("bar");

        done();

      });
    });
  });

  it("should return null for a non-existing key", function (done) {

    r.get("does-not-exist", function (err, result) {

      should.not.exist(result);

      done();

    });
  });

});

describe("getset", function () {
  it("should return null for a non-existing key", function (done) {
    r.getset("does-not-exist", "newValue", function (err, result) {
      should.not.exist(result);

      done();
    });

  });

  it("should return the value of the key before setting it", function (done) {
    r.set("test-key", "oldValue", function (err, result) {
      r.getset("test-key", "newValue", function (err, result) {
        result.should.equal("oldValue");
        r.get("test-key", function (err, result) {
          result.should.equal("newValue");
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

        done();
      });
    });
  });

});

describe("setex", function () {

  this.timeout(5000);

  it("should set a key", function (done) {
    var key = 'test_persist';
    r.setex(key, 1000, "val", function (err, result) {
      result.should.equal("OK");
      r.get(key, function (err, result) {
        result.should.equal("val");
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
        done();
      });
    }, 100)

  });

});

describe("setnx", function () {
  it("should set a key", function (done) {

    r.setnx("foo", "10", function (err, result) {
        result.should.eql(1);

      r.get("foo", function (err, result) {
        result.should.eql("10");
        done();
      });
    });
  });

  it("should not re-set a key", function (done) {

    r.set("foo", "val", function (err, result) {

      r.setnx("foo", "otherVal", function (err, result) {

        result.should.eql(0);

        r.get("foo", function(err, result) {
            result.should.equal("val");

            done();
        });
      });
    });
  });
});

describe("mget", function () {

  it("should fetch multiple values across multiple keys", function (done) {

    r.mset(["multi1", "one", "multi3", "three"], function (err, result) {
      r.mget("multi1", "multi2", "multi3", function (err, result) {
        result.should.be.ok();

        result[0].should.equal("one");

        should.not.exist(result[1]);

        result[2].should.equal("three");

        done();

      });
    });
  });
});

describe("mset", function () {

  it("should set multiple keys at once using an array", function (done) {

    r.mset(["msetkey1", 1, "msetkey2", 2], function (err, result) {
      result.should.be.eql("OK");

      r.mget(["msetkey1", "msetkey2"], function (err, results) {
        results.should.deepEqual(["1", "2"]);
        done();
      });
    });
  });

  it("should set multiple keys at once using arguments", function (done) {

    r.mset("msetkey1", 3, "msetkey2", 4, function (err, result) {
      result.should.be.eql("OK");

      r.mget(["msetkey1", "msetkey2"], function (err, results) {
        results.should.deepEqual(["3", "4"]);
        done();
      });
    });
  });


  it("should fail when passed an array of odd length", function (done) {

    r.mset(["failkey1", 1, "failkey2"], function (err, result) {
      err.should.be.ok();
      done();
    });
  });

  it("should fail when passing no arguments", function (done) {

    r.mset(function (err, result) {
      err.should.be.ok();
      done();
    });
  });

  it("should fail when passing an empty array", function (done) {

    r.mset([], function (err, result) {
      err.should.be.ok();
      done();
    });
  });

});

describe("msetnx", function () {

  it("should be able to set multiple non-existing keys", function (done) {

    r.msetnx(["msetnxkey1", 1, "msetnxkey2", 2], function (err, result) {
      result.should.be.eql(1);

      r.mget(["msetnxkey1", "msetnxkey2"], function (err, results) {
        results.should.deepEqual(["1", "2"]);
        done();
      });
    });
  });

  it("should fail to set any key if a single one exists already", function (done) {

    r.set("msetnxkey1", 1, function (err, result) {

      r.msetnx(["msetnxkey1", 1, "msetnxkey3", 3], function (err, result) {
        result.should.be.eql(0);

        r.mget(["msetnxkey1", "msetnxkey3"], function (err, results) {
          results.should.deepEqual(["1", null]);
          done();
        });
      });
    });
  });

});

describe("incr", function () {

  it("should increment the number stored at key", function (done) {

    r.set("foo", "10", function (err, result) {

      r.incr("foo", function (err, result) {

        result.should.eql(11);

        r.get("foo", function (err, result) {

          result.should.eql("11");

          done();
        });
      });
    });
  });

  it("should set 0 before performing if the key does not exist", function (done) {

    r.incr("bar", function (err, result) {

      result.should.eql(1);

      r.get("bar", function (err, result) {

        result.should.eql("1");

        done();
      });
    });
  });

  it("should keep expires if it is set", function (done) {

    r.set("foo", 10, "EX", 5, function (err, result) {

      r.incr("foo", function (err, result) {

        r.pttl("foo", function (err, result) {

          (result === -1).should.be.false();

          done();
        });
      });
    });
  });

  it("should return error if the key holds the wrong kind of value.", function (done) {

    r.hset("foo", "bar", "baz", function (err, result) {

      r.incr("foo", function (err, result) {

        err.message.should.eql("WRONGTYPE Operation against a key holding the wrong kind of value");

        done();
      });
    });
  });

  it("should return error if the key contains a string that can not be represented as integer.", function (done) {

    r.set("baz", "qux", function (err, result) {

      r.incr("baz", function (err, result) {

        err.message.should.equal("ERR value is not an integer or out of range");

        done();
      });
    });
  });
});

describe("incrby", function () {

  it("should increment the number stored at key by 2", function (done) {

    r.set("foo", "10", function (err, result) {

      r.incrby("foo", 2, function (err, result) {

        result.should.eql(12);

        r.get("foo", function (err, result) {

          result.should.eql("12");

          done();
        });
      });
    });
  });

  it("should set 0 before performing if the key does not exist", function (done) {

    r.incrby("bar", 5, function (err, result) {

      result.should.eql(5);

      r.get("bar", function (err, result) {

        result.should.eql("5");

        done();
      });
    });
  });

  it("should keep expires if it is set", function (done) {

    r.set("foo", 10, "EX", 5, function (err, result) {

      r.incrby("foo", 1, function (err, result) {

        r.pttl("foo", function (err, result) {

          (result === -1).should.be.false();

          done();
        });
      });
    });
  });

  it("should return error if the key holds the wrong kind of value.", function (done) {

    r.hset("foo", "bar", "baz", function (err, result) {

      r.incrby("foo", 5, function (err, result) {

        err.message.should.eql("WRONGTYPE Operation against a key holding the wrong kind of value");

        done();
      });
    });
  });

  it("should return error if the key contains a string that can not be represented as integer.", function (done) {

    r.set("baz", "qux", function (err, result) {

      r.incrby("baz", 5, function (err, result) {

        err.message.should.equal("ERR value is not an integer or out of range");

        done();
      });
    });
  });
});

describe("incrbyfloat", function () {

  it("should increment the number stored at key by a float value", function (done) {

    r.set("foo", "1.5", function (err, result) {

      r.incrbyfloat("foo", "0.5", function (err, result) {

        result.should.eql("2");

        r.get("foo", function (err, result) {

          result.should.eql("2");

          done();
        });
      });
    });
  });

  it("should set 0 before performing if the key does not exist", function (done) {

    r.incrbyfloat("bar", "1.5", function (err, result) {
      result.should.eql("1.5");

      r.get("bar", function (err, result) {
        result.should.eql("1.5");

        done();
      });
    });
  });

  it("should keep expires if it is set", function (done) {

    r.set("foo", 10, "EX", 5, function (err, result) {

      r.incrbyfloat("foo", "1.5", function (err, result) {

        r.pttl("foo", function (err, result) {

          (result === -1).should.be.false();

          done();
        });
      });
    });
  });

  it("should return error if the key holds the wrong kind of value.", function (done) {

    r.hset("foo", "bar", "baz", function (err, result) {

      r.incrbyfloat("foo", "1.5", function (err, result) {

        err.message.should.eql("WRONGTYPE Operation against a key holding the wrong kind of value");

        done();
      });
    });
  });

  it("should return error if the key contains a string that can not be represented as float.", function (done) {

    r.set("baz", "qux", function (err, result) {

      r.incrbyfloat("baz", "1.5",function (err, result) {

        err.message.should.equal("ERR value is not a valid float");

        done();
      });
    });
  });
});
