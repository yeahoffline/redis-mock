var should = require("should")
var events = require("events");
var helpers = require("./helpers");

var r;

beforeEach(function () {
  r = helpers.createClient();
});

afterEach(function (done) {
  r.flushall();
  r.quit(done);
});

describe("del", function () {

  it("should do nothing with non-existant keys", function (done) {
    r.del(["key1", "key2", "key3"], function (err, result) {
      result.should.equal(0);
      r.del("key4", function (err, result) {
        result.should.equal(0);
        done();
      });
    });
  });

  it("should delete existing keys", function (done) {
    r.set("test", "test", function (err, result) {
      r.del("test", function (err, result) {
        result.should.equal(1);
        r.get("test", function (err, result) {
          should.not.exist(result);
          done();
        });
      });
    });
  });

  it("should delete multiple keys", function (done) {
    r.set("test", "val", function (err, result) {
      r.set("test2", "val2", function (err, result) {
        r.del(["test", "test2", "noexistant"], function (err, result) {
          result.should.equal(2);
          done();
        });
      });
    });
  });

});

describe("exists", function () {

  it("should return 0 for non-existing keys", function (done) {

    r.exists("test", function (err, result) {

      result.should.equal(0);

      done();

    });
  });

  it("should return 1 for existing keys", function (done) {

    r.set("test", "test", function (err, result) {

      r.exists("test", function (err, result) {

        result.should.equal(1);

        r.del("test");

        done();

      });

    });

  });

  it("should return an array for multiple existing keys, existing and not", function (done) {
    r.set("test", "test", function (err, result) {
      r.set("test2", "test", function (err, result) {
        r.exists("test", "test2", "nonexistant", function (err, result) {
            result.should.eql(2);
            done();
        });
      });
    });
  });
});

describe("type", function() {
  it('should return "none" for non existent keys', function(done) {
    r.type("testKey", function(err, result) {
        result.should.equal("none");

        done();
    });
  });

  it('should return type "string" for key that exists with string value', function(done) {
    r.set("testKey", "testValue", function(err, result) {
      r.type("testKey", function(err, result) {
        result.should.equal("string");

        done();
      });
    });
  });

  it('should return type "list" for key that exists with list value', function(done) {
    r.lpush("testValue", 1, function (err, result) {
      r.type("testValue", function(err, result) {
        result.should.equal("list");

        done();
      });
    });
  });

  it('should return type "set" for key that exists with set value', function (done) {
    r.sadd('testKey', 'testValue', function (err, result) {
      r.type("testKey", function(err, result) {
        result.should.equal("set");

        done();
      });
    });
  });

  it('should return type "zset" for key that exists with zset value', function (done) {
    r.zadd(["testKey",  1, 'm1'], function(err, result) {
      r.type("testKey", function(err, result) {
        result.should.equal("zset");

        done();
      });
    });
  });

  it('should return type "hash" for key that exists with hash value', function (done) {
    r.hset("testHash", "testKey", "test", function (err, result) {
      r.type("testHash", function(err, result) {
        result.should.equal("hash");

        done();
      });
    });
  });
});

describe("expire", function () {

  it("should return 0 for non-existing key", function (done) {
    r.expire("test", 10, function (err, result) {
      result.should.equal(0);
      done();
    });
  });

  it("should return 1 when timeout set on existing key", function (done) {
    r.set("test", "test", function (err, result) {
      r.expire("test", 10, function (err, result) {
        result.should.equal(1);
        r.del("test");
        done();
      });
    });
  });

  it("should make key disappear after the set time", function (done) {
    r.set("test", "val", function (err, result) {
      r.expire("test", 1, function (err, result) {
        result.should.equal(1);
        setTimeout(function () {
          r.exists("test", function (err, result) {
            result.should.equal(0);
            done();
          });
        }, 1500);
      });
    });
  });

  it("accepts timeouts exceeding 2**31 msec", function (done) {
    r.set("test_exceeds", "val", function (err, result) {
      r.expire("test_exceeds", 86400*31 /* one month */, function (err, result) {
        result.should.equal(1);
        setTimeout(function () {
          r.exists("test_exceeds", function (err, result) {
            result.should.equal(1);
            done();
          });
        }, 1000);
      });
    });
  });

});

describe('persist', function () {

  it("should return 0 for non-existing key", function (done) {
    r.persist("test", function (err, result) {
      result.should.equal(0);
      done();
    });
  });

  it("should return 0 when timeout is not set on existing key", function (done) {
    r.set("test", "val", function (err, result) {
      r.persist("test", function (err, result) {
        result.should.equal(0);
        done();
      });
    });
  });

  it("should return 1 when timeout is set on existing key", function (done) {
    r.setex("test", 10, "val", function (err, result) {
      r.persist("test", function (err, result) {
        result.should.equal(1);
        done();
      });
    });
  });

  it("should reset ttl to -1", function (done) {
    r.setex("test", 10, "val", function (err, result) {
      r.persist("test", function (err, result) {
        r.ttl("test", function (err, result) {
          result.should.equal(-1);
          done();
        })
      });
    });
  });

  it("should prevent key from disappearing after initial ttl", function (done) {
    r.setex("test", 1, "val", function (err, result) {
      r.persist("test", function (err, result) {
        setTimeout(function () {
          r.get("test", function (err, result) {
            result.should.equal("val");
            done();
          })
        }, 1500);
      });
    });
  });
})

describe("pexpire", function () {

  it("should return 0 for non-existing key", function (done) {
    r.pexpire("test", 10000, function (err, result) {
      result.should.equal(0);
      done();
    });
  });

  it("should return 1 when timeout set on existing key", function (done) {
    r.set("test", "test", function (err, result) {
      r.pexpire("test", 10000, function (err, result) {
        result.should.equal(1);
        r.del("test");
        done();
      });
    });
  });

  it("should make key disappear after the set time", function (done) {
    r.set("test", "val", function (err, result) {
      r.pexpire("test", 300, function (err, result) {
        result.should.equal(1);
        setTimeout(function () {
          r.exists("test", function (err, result) {
            result.should.equal(0);
            done();
          });
        }, 500);
      });
    });
  });

});


describe("ttl", function () {

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

        done();
      });
    });
  });

});

describe("pttl", function () {
  it("should return remaining time before expiration in milliseconds", function (done) {
    r.set("test", "test", function (err, result) {
      r.expire("test", 100, function (err, result) {
        result.should.equal(1);

        setTimeout(function () {
          r.pttl("test", function (err, pttl) {
            if (err) {
              done(err);
            }

            pttl.should.be.within(98000, 99000);
            r.del("test");

            done();
          });
        }, 1500);
      });

    });

  });

  it("should return -2 for non-existing key", function (done) {
    r.pttl("test", function (err, ttl) {
      if (err) {
        done(err);
      }

      ttl.should.equal(-2);

      done();
    });
  });

  it("should return -1 for an existing key with no EXPIRE", function (done) {
    r.set("test", "test", function (err, result) {
      r.pttl("test", function (err, ttl) {
        if (err) {
          done(err);
        }

        ttl.should.equal(-1);
        r.del("test");

        done();
      });
    });
  });

});

describe("keys", function () {

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
  it("should scan all keys - *", function (done) {
    var keys = [];
    var index = 0;
    var loop = function() {
      r.scan(index, 'match', '*', 'count', 1000, function (err, indexAndKeys) {
        if(err) {
          done(err);
          return;
        }
        keys = keys.concat(indexAndKeys[1]);
        var index = indexAndKeys[0];
        if (index !== '0') {
          loop();
        } else {
          keys.should.be.instanceof(Array);
          keys.should.containEql('hello');
          keys.should.containEql('hallo');
          keys.should.containEql('hxlo');
          keys.should.have.length(3);
          index.should.be.equal('0');
          done();
        }
      });
    };
    loop();
  });
});

describe("rename", function () {
  it("should return true and set key to newKey when newKey is empty", function (done) {
    r.set("test", "test", function (err, result) {
      r.rename("test", "newTest", function (err, result) {
        if(err) {
          done(err);
          return;
        }
        result.should.equal("OK")
        r.get("test", function (err, result) {
          should.not.exist(result);
          r.get("newTest", function (err, result) {
            result.should.equal("test")
            done();
          });
        });
      });
    });
  });

  it("should return true and set key to newKey when newKey exists", function (done) {
    r.set("newTest", "newTest", function (err, result) {
      r.set("test", "test", function (err, result) {
        r.rename("test", "newTest", function (err, result) {
          if(err) {
            done(err);
            return;
          }
          result.should.equal("OK")
          r.get("test", function (err, result) {
            should.not.exist(result);
            r.get("newTest", function (err, result) {
              result.should.equal("test")
              done();
            });
          });
        });
      });
    });
  });

  it("should throw error when key does not exist", function (done) {
    r.rename("test", "newTest", function (err, result) {
      err.message.should.equal("ERR no such key")
      done()
    })
  })
})

describe("renamenx", function () {
  it("should return true and set key to newKey when newKey does not exist", function (done) {
    r.set("test", "test", function (err, result) {
      r.renamenx("test", "newTest", function (err, result) {
        if(err) {
          done(err);
          return;
        }
        result.should.equal(1)
        r.get("test", function (err, result) {
          should.not.exist(result);
          r.get("newTest", function (err, result) {
            result.should.equal("test")
            done();
          });
        });
      });
    });
  });

  it("should return false and not set key to newKey when newKey exists", function (done) {
    r.set("newTest", "newTest", function (err, result) {
      r.set("test", "test", function (err, result) {
        r.renamenx("test", "newTest", function (err, result) {
          if(err) {
            done(err);
            return;
          }
          result.should.equal(0);
          r.get("test", function (err, result) {
            result.should.equal("test");
            r.get("newTest", function (err, result) {
              result.should.equal("newTest")
              done();
            });
          });
        });
      });
    });
  });

  it("should throw error when key does not exist", function (done) {
    r.rename("test", "newTest", function (err, result) {
      err.message.should.equal("ERR no such key")
      done()
    })
  });

  it("should throw error when key does not exist and newKey exists", function (done) {
    r.set("newTest", "newTest", function (err, result) {
      r.rename("test", "newTest", function (err, result) {
        err.message.should.equal("ERR no such key")
        done()
      })
    });
  });
});

describe("dbsize", function () {
  it("should return 0 for empty storage", function(done) {
    r.dbsize(function(err, result) {
      result.should.equal(0)
      done()
    });
  });
  it("should return number of keys in storage", function(done) {
    r.set('test','test', function(err, result) {
      r.dbsize(function(err, result) {
        result.should.equal(1)
        done()
      });
    });
  });
});
