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


describe("basic pushing/poping list", function () {
  var testKey = "myKey";
  var testKey2 = "myKey2";
  var testValues = [1, JSON.stringify({foo: "bar"}), 3, 4, 5];
  var testValue = 10;

  it("should not get any value from the end", function (done) {
    r.rpop(testKey, function (err, result) {
      should.not.exist(result);
      done();
    });
  });

  it("should not get any value from the start", function (done) {
    r.lpop(testKey, function (err, result) {
      should.not.exist(result);
      done();
    });
  });

  it("should push and pop the same element on the end", function (done) {
    r.rpush(testKey, testValue, function (err, result) {
      result.should.equal(1);
      r.rpop(testKey, function (err, result) {
        result.should.equal(testValue + "");
        done();
      });
    });
  });

  it("should push and pop the same element on the start", function (done) {
    r.lpush(testKey, testValue, function (err, result) {
      result.should.equal(1);
      r.lpop(testKey, function (err, result) {
        result.should.equal(testValue + "");
        done();
      });
    });
  });

  it("should check a single rpush array arg works", function (done) {
    r.rpush([testKey, testValue], function (err, result) {
      result.should.equal(1);
      r.rpop(testKey, function (err, result) {
        result.should.equal(testValue + "");
        done();
      });
    });
  });

  it("should check a single lpush array arg works", function (done) {
    r.lpush([testKey, testValue], function (err, result) {
      result.should.equal(1);
      r.rpop(testKey, function (err, result) {
        result.should.equal(testValue + "");
        done();
      });
    });
  });

  it("should be a queue", function (done) {
    r.lpush(testKey, testValue, function (err, result) {
      result.should.equal(1);
      r.lpush(testKey, testValue + 1, function (err, result) {
        result.should.equal(2);
        r.rpop(testKey, function (err, result) {
          result.should.equal(testValue + "");
          done();
        });
      });
    });
  });

  it("should add a few elements", function (done) {
    var cb = function (err, result) {
      result.should.equal(testValues.length);
      r.lpop(testKey2, function (err, result) {
        result.should.equal(testValues[testValues.length - 1] + "");
        r.rpop(testKey2, function (err, result) {
          result.should.equal(testValues[0] + "");
          done();
        });
      });
    };
    r.lpush.apply(r, [testKey2].concat(testValues, cb));
  });
});

describe('rpoplpush', function () {
  var testSrcKey = "mySourceKey";
  var testDestKey = "myDestKey";
  var testValues = ['1', '2', '3', '4'];

  it('should rotate an item from the end to the start of the same list', function (done) {
    r.lpush(testSrcKey, testValues[0], testValues[1], testValues[2], function (err, result) {
      result.should.equal(3);
      r.rpoplpush(testSrcKey, testSrcKey, function(err, result) {
        result.should.equal(testValues[0]);
        r.lpop(testSrcKey, function(err, result) {
          result.should.equal(testValues[0]);
          done();
        });
      });
    });
  });

  it('should rotate an item from the end of one list to the start of another', function (done) {
    r.lpush(testSrcKey, testValues[0], testValues[1], testValues[2], function (err, result) {
      result.should.equal(3);
      r.lpush(testDestKey, testValues[3], function (err, result) {
        result.should.equal(1);
        r.rpoplpush(testSrcKey, testDestKey, function(err, result) {
          result.should.equal(testValues[0]);
          r.lpop(testDestKey, function (err, result) {
            result.should.equal(testValues[0]);
            r.lpop(testSrcKey, function (err, result) {
              result.should.equal(testValues[2]);
              done();
            });
          });
        });
      });
    });
  });
})

describe("llen", function () {
  var testKey = "myKey3";
  var testValues = [1, 2, 3, 4, 5];
  var testValue = 10;
  it("should return 0", function (done) {

    r.llen(testKey, function (err, result) {
      result.should.equal(0);
      done();
    });
  });

  it("should return 5 and evolve", function (done) {
    var cb = function (err, res) {
      r.llen(testKey, function (err, result) {
        result.should.equal(testValues.length);
        r.rpop(testKey, function (err, result) {
          r.llen(testKey, function (err, result) {
            result.should.equal(testValues.length - 1);
            done();
          });
        });
      });
    };
    r.lpush.apply(r, [testKey].concat(testValues, cb));
  });

});

describe("lindex", function () {
  var testKey = "myKey4";
  var testKey2 = "myKey5";
  var keyUndefined = "keyUndefined";
  var testValues = [1, 2, 3, 4, 5];

  it("getting index of non exisiting list", function (done) {

    r.lindex(keyUndefined, 0, function (err, result) {

      should.not.exist(result);

      r.lindex(keyUndefined, 12, function (err, result) {

        should.not.exist(result);

        done();
      });
    });
  });

  it("getting positive indexes of exisiting list", function (done) {

    var cb = function (err, result) {

      r.lindex(testKey, testValues.length, function (err, result) {

        should.not.exist(result);

        r.lindex(testKey, 0, function (err, result) {

          result.should.equal(testValues[0] + "");

          r.lindex(testKey, testValues.length - 1, function (err, result) {

            result.should.equal(testValues[testValues.length - 1] + '');

            done();
          });
        });
      });
    };
    r.rpush.apply(r, [testKey].concat(testValues, cb));
  });

  it("getting negative indexes of exisiting list", function (done) {

    var cb = function (err, result) {

      r.lindex(testKey2, -(testValues.length + 1), function (err, result) {

        should.not.exist(result);

        r.lindex(testKey2, -1, function (err, result) {

          result.should.equal(testValues[testValues.length - 1] + "");

          r.lindex(testKey2, -testValues.length, function (err, result) {

            result.should.equal(testValues[0] + '');

            done();
          });
        });
      });
    };
    r.rpush.apply(r, [testKey2].concat(testValues, cb));
  });
});

describe("lrange", function () {
  var key1 = "lrange1";
  var key2 = "lrange2";
  var key3 = "lrange3";
  var keyU = "keyMissing";
  var testValues = [1, 2, 3, 4, 5];

  it("getting a non-exisiting list", function (done) {
    r.lrange(keyU, 0, -1, function (err, result) {
      result.should.be.an.Array().and.have.lengthOf(0);
      done();
    });
  });

  it("getting positive indexes of exisiting list", function (done) {
    var cb = function (err, result) {
      r.lrange(key1, 0, 1, function (err, result) {
        result.should.deepEqual(["1", "2"]);
        r.lrange(key1, 0, 9, function (err, result) {
          result.should.deepEqual(["1", "2", "3", "4", "5"]);
          r.lrange(key1, 1, 2, function (err, result) {
            result.should.deepEqual(["2", "3"]);
            r.lrange(key1, 2, 1, function (err, result) {
              result.should.be.an.Array().and.have.lengthOf(0);
              done();
            });
          });
        });
      });
    };
    r.rpush.apply(r, [key1].concat(testValues, cb));
  });

  it("getting negative indexes of exisiting list", function (done) {
    var cb = function (err, result) {
      r.lrange(key2, -2, -1, function (err, result) {
        result.should.deepEqual(["4", "5"]);
        r.lrange(key2, -9, -4, function (err, result) {
          result.should.deepEqual(["1", "2"]);
          r.lrange(key2, -4, -5, function (err, result) {
            result.should.be.an.Array().and.have.lengthOf(0);
            done();
          });
        });
      });
    };
    r.rpush.apply(r, [key2].concat(testValues, cb));
  });

  it("getting positive and negative indexes of exisiting list", function (done) {
    var cb = function (err, result) {
      r.lrange(key3, 0, -1, function (err, result) {
        result.should.deepEqual(["1", "2", "3", "4", "5"]);
        r.lrange(key3, 1, -3, function (err, result) {
          result.should.deepEqual(["2", "3"]);
          r.lrange(key3, -4, 4, function (err, result) {
            result.should.deepEqual(["2", "3", "4", "5"]);
            done();
          });
        });
      });
    };
    r.rpush.apply(r, [key3].concat(testValues, cb));
  });
});

describe("lrem", function () {
  var key1 = "lrem1";
  var key2 = "lrem2";
  var key3 = "lrem3";
  var key4 = "lrem4";
  var key5 = "lrem5";
  var keyU = "keyMissing";

  it("removing from a non-exisiting list", function (done) {
    r.lrem(keyU, 0, 5, function (err, result) {
      result.should.be.equal(0);
      done();
    });
  });

  it("removing all instances of a value", function (done) {
    r.rpush(key1, 1, 2, 2, 3, function() {
      r.lrange(key1, 0, -1, function (err, result) {
        result.should.deepEqual(["1", "2", "2", "3"]);
        r.lrem(key1, 0, 2, function (err, result) {
          result.should.be.equal(2);
          r.lrange(key1, 0, -1, function (err, result) {
            result.should.deepEqual(["1", "3"]);
            done();
          });
        });
      });
    });
  });

  it("removing some instances of a value (l to r)", function (done) {
    r.rpush(key2, 1, 2, 2, 4, 2, 2, 3, function() {
      r.lrem(key2, 3, 2, function (err, result) {
        result.should.be.equal(3);
        r.lrange(key2, 0, -1, function (err, result) {
          result.should.deepEqual(["1", "4", "2", "3"]);
          done();
        });
      });
    });
  });

  it("removing some instances of a value (r to l)", function (done) {
    r.rpush(key3, 1, 2, 2, 4, 2, 2, 3, function() {
      r.lrem(key3, -1, 2, function (err, result) {
        result.should.be.equal(1);
        r.lrange(key3, 0, -1, function (err, result) {
          result.should.deepEqual(["1", "2", "2", "4", "2", "3"]);
          done();
        });
      });
    });
  });

  it("removing some instances of a value (r to l)", function (done) {
    r.rpush(key4, 1, 2, 2, 4, 2, 2, 2, function() {
      r.lrem(key4, -3, 2, function (err, result) {
        result.should.be.equal(3);
        r.lrange(key4, 0, -1, function (err, result) {
          result.should.deepEqual(["1", "2", "2", "4"]);
          done();
        });
      });
    });
  });

  it("removing no instances of a value", function (done) {
    r.rpush(key5, 1, 2, 3, 4, function() {
      r.lrange(key5, 0, -1, function (err, result) {
        result.should.deepEqual(["1", "2", "3", "4"]);
        r.lrem(key5, 0, 5, function (err, result) {
          result.should.be.equal(0);
          r.lrange(key5, 0, -1, function (err, result) {
            result.should.deepEqual(["1", "2", "3", "4"]);
            done();
          });
        });
      });
    });
  });
});

describe("lset", function () {

  var testKey = "myKey4";
  var testKey2 = "myKey5";
  var testKey3 = "myKey6";
  var testKey4 = "myKey7";
  var keyUndefined = "keyUndefined";
  var keyUndefined2 = "keyUndefined2";
  var testValues = [1, 2, 3, 4, 5];

  it("changing value of non exisiting list", function (done) {

    r.lset(keyUndefined, 0, 1, function (err, result) {
      err.message.should.equal("ERR no such key");
      should.not.exist(result);

      done();
    });
  });

  it("setting impossible indexes", function (done) {

    var cb = function (err, result) {

      r.lset(keyUndefined2, testValues.length + 1, 3, function (err, result) {

        err.message.should.equal("ERR index out of range");
        should.not.exist(result);

        r.lset(keyUndefined2, -(testValues.length + 2), 3, function (err, result) {

          err.message.should.equal("ERR index out of range");
          should.not.exist(result);

          done();
        });
      });
    };
    r.rpush.apply(r, [keyUndefined2].concat(testValues, cb));
  });

  it("changing value positive indexes from start index 0", function (done) {

    var cb = function (err, result) {

      r.lset(testKey, 0, 3, function (err, result) {

        result.should.equal("OK");

        r.lindex(testKey, 0, function (err, result) {

          result.should.equal('3');

          done();
        });
      });
    };
    r.rpush.apply(r, [testKey].concat(testValues, cb));
  });

  it("changing value positive indexes from start index length-1", function (done) {

    var cb = function (err, result) {

      r.lset(testKey2, testValues.length - 1, 3, function (err, result) {

        result.should.equal("OK");

        r.lindex(testKey2, testValues.length - 1, function (err, result) {

          result.should.equal('3');

          done();
        });
      });
    };
    r.rpush.apply(r, [testKey2].concat(testValues, cb));
  });

  it("changing value negative indexes of exisiting list index -1", function (done) {

    var cb = function (err, result) {

      r.lset(testKey3, -1, 42, function (err, result) {

        result.should.equal("OK");

        r.lindex(testKey3, -1, function (err, result) {

          result.should.equal('42');

          done();
        });
      });
    };
    r.rpush.apply(r, [testKey3].concat(testValues, cb));
  });

  it("changing value negative indexes of exisiting list index -length", function (done) {

    var cb = function (err, result) {

      r.lset(testKey4, -testValues.length, 45, function (err, result) {

        result.should.equal("OK");

        r.lindex(testKey4, 0, function (err, result) {

          result.should.equal('45');

          done();
        });
      });
    };
    r.rpush.apply(r, [testKey4].concat(testValues, cb));
  });
});


describe("rpushx", function (argument) {
  var testKey = "myKey8";

  it("tries to push on empty list", function (done) {

    r.rpushx(testKey, 3, function (err, result) {

      result.should.equal(0);

      r.lindex(testKey, 0, function (err, result) {

        should.not.exist(result);

        done();
      });
    });
  });

  it("tries to push on non empty list", function (done) {

    r.rpush(testKey, 3, function (err, result) {

      r.rpushx(testKey, 5, function (err, result) {

        result.should.equal(2);

        r.lindex(testKey, 1, function (err, result) {

          result.should.equal('5');

          done();
        });
      });
    });
  });
});

describe("lpushx", function (argument) {
  var testKey = "myKey9";

  it("tries to push on empty list", function (done) {

    r.lpushx(testKey, 3, function (err, result) {

      result.should.equal(0);

      r.lindex(testKey, 0, function (err, result) {

        should.not.exist(result);

        done();
      });
    });
  });

  it("tries to push on non empty list", function (done) {

    r.rpush(testKey, 3, function (err, result) {

      r.lpushx(testKey, 5, function (err, result) {

        result.should.equal(2);

        r.lindex(testKey, 0, function (err, result) {

          result.should.equal('5');

          done();
        });
      });
    });
  });
});

describe("brpop", function () {

  it("should block until the end of the timeout", function (done) {
    var time = false;
    r.brpop("foo", 1, function (err, result) {
      should.not.exist(result);
      time.should.equal(true);
      done();
    });

    setTimeout(function () {
      time = true;
    }, 500);

  });

  it("should block until the end of the timeout even with multiple lists", function (done) {
    var time = false;

    r.brpop("foo", "ffo", 1, function (err, result) {
      should.not.exist(result);
      time.should.equal(true);
      done();
    });

    setTimeout(function () {
      time = true;
    }, 500);

  });

  it("should block with empty list", function (done) {
    r.rpush("foo2", "bar", function (err, result) {

      r.rpop("foo2", function (err, result) {

        var time = false;

        r.brpop("foo2", "ffo2", 1, function (err, result) {

          should.not.exist(result);
          time.should.equal(true);
          done();
        });

        setTimeout(function () {
          time = true
        }, 500);
      });
    });
  });

  it("should unblock when an element is added", function (done) {
    var r2 = helpers.createClient();
    var time = false;

    r.brpop("foo3", 5, function (err, result) {
      result[0].should.equal("foo3");
      result[1].should.equal("bar");
      time.should.equal(true);
      done();
    });

    setTimeout(function () {
      time = true
    }, 1000);

    setTimeout(function () {
      r2.rpush("foo3", "bar");
    }, 1500);
  });

  it("should unblock when an element is added to any list", function (done) {
    var r2 = helpers.createClient();
    var time = false;
    r.brpop("foo3", "foo4", 2, function (err, result) {

      result[0].should.equal("foo4");
      result[1].should.equal("bim");
      time.should.equal(true);
      done();
    });

    setTimeout(function () {
      time = true
    }, 500);

    setTimeout(function () {
      r2.rpush("foo4", "bim");
    }, 1000);
  });

  it("push with multiple elements should be consired as one", function (done) {
    var r2 = helpers.createClient();
    var time = false;
    r.brpop("foo5", 2, function (err, result) {
      result[0].should.equal("foo5");
      result[1].should.equal("bam");
      time.should.equal(true);
      done();
    });

    setTimeout(function () {
      time = true
    }, 500);

    setTimeout(function () {
      r2.rpush("foo5", "bim", "bam");
    }, 1000);
  });

  it("should once it's unblocked it shouldn't be called again", function (done) {
    var r2 = helpers.createClient();
    var called = 0;
    r.brpop("foo6", "foo7", 2, function (err, result) {
      called += 1;
    });

    setTimeout(function () {
      r2.rpush("foo6", "bim");
      r2.rpush("foo7", "bam");
    }, 500);

    setTimeout(function () {
      called.should.equal(1);
      done();
    }, 1000);
  });

  /** This test needs for the connection to be able to be blocked
   it("should not work if we push with the connection which is blocked", function(done) {
  var r = helpers.createClient();
  console.log("Waiting for pop...");
  r.brpop("foo6", "foo7", 1, function(err, result) {

  should.not.exist(err);
  should.not.exist(result);

  done();
  });

  setTimeout(function() {
  r.rpush("foo6", "bim");
  r.rpush("foo7", "bam");
  }, 500);
  });
   */
});

describe("blpop", function () {

  it("should block until the end of the timeout", function (done) {
    var time = false;

    r.blpop("foo8", 1, function (err, result) {
      should.not.exist(result);
      time.should.equal(true);

      done();

    });

    setTimeout(function () {
      time = true
    }, 500);

  });

  it("should block until the end of the timeout even with multiple lists", function (done) {
    var time = false;
    r.blpop("foo9", "ffo9", 1, function (err, result) {
      should.not.exist(result);
      time.should.equal(true);
      done();
    });

    setTimeout(function () {
      time = true
    }, 500);
  });

  it("should block with empty list too", function (done) {
    r.rpush("foo10", "bar", function (err, result) {
      r.rpop("foo10", function (err, result) {
        var time = false;
        r.blpop("foo10", "ffo10", 1, function (err, result) {
          should.not.exist(result);
          time.should.equal(true);
          done();
        });

        setTimeout(function () {
          time = true
        }, 500);
      });
    });
  });

  it("should unblock when an element is added", function (done) {
    var r2 = helpers.createClient();
    var time = false;

    r.blpop("foo11", 1, function (err, result) {
      result[0].should.equal("foo11");
      result[1].should.equal("bar");
      time.should.equal(true);
      done();
    });

    setTimeout(function () {
      time = true
    }, 200);

    setTimeout(function () {
      r2.rpush("foo11", "bar");
    }, 500);
  });

  it("should unblock when an element is added to any list", function (done) {
    var r2 = helpers.createClient();
    var time = false;

    r.blpop("foo12", "foo13", 1, function (err, result) {
      result[0].should.equal("foo12");
      result[1].should.equal("bim");
      time.should.equal(true);
      done();
    });

    setTimeout(function () {
      time = true
    }, 200);
    setTimeout(function () {
      r2.rpush("foo12", "bim");
    }, 500);
  });

  it("push with multiple elements should be considered as one", function (done) {
    var r2 = helpers.createClient();
    var time = false;

    r.blpop("foo14", 1, function (err, result) {
      result[0].should.equal("foo14");
      result[1].should.equal("bam");
      time.should.equal(true);
      done();
    });

    setTimeout(function () {
      time = true
    }, 200);

    setTimeout(function () {
      r2.lpush("foo14", "bim", "bam");
    }, 500);

  });

  it("should once it's unblocked it shouldn't be called again", function (done) {
    var r2 = helpers.createClient();
    var called = 0;
    r.blpop("foo15", "foo16", 1, function (err, result) {
      called += 1;
    });

    setTimeout(function () {
      r2.rpush("foo15", "bim");
      r2.rpush("foo16", "bam");
    }, 300);

    setTimeout(function () {
      called.should.equal(1);
      done();
    }, 1500);
  });

  it("should not block when an element is already in the list", function(done) {
    var r2 = helpers.createClient();
    var time = false;

    r2.rpush("foo11", "bar");
    r.blpop("foo11", 1, function (err, result) {
      result[0].should.equal("foo11");
      result[1].should.equal("bar");
      time.should.equal(false);
      done();
    });

    setTimeout(function () {
      time = true
    }, 200);
  });

  it("should return an array of key followed by value when an element is already in the list", function(done) {
    var r2 = helpers.createClient();

    r2.rpush("foo11", "bar");
    r.blpop("foo11", 1, function (err, result) {
      result[0].should.equal("foo11");
      result[1].should.equal("bar");
      done();
    });
  });
});

describe("ltrim", function(argument) {
  var testKey = "myKey10";
  var testKey2 = "myKey11";
  var testKey3 = "myKey12";
  var testKey4 = "myKey13";
  var keyUndefined = "keyUndefined";
  var keyUndefined2 = "keyUndefined2";
  var testValues = [1, 2, 3, 4, 5];

  it("does nothing for a non-existent list", function(done) {
    r.ltrim(testKey, 0, 2, function(err, result) {
      result.should.equal('OK');
      done();
    });
  });

  it("removes the whole list when start/end outside list length", function(done) {
    r.rpush(testKey, 1, 2, 3, 4, 5, function(err, result) {
      r.ltrim(testKey, 5, 8, function(err, result) {
        result.should.equal('OK');
        r.lrange(testKey, 0, 4, function(err, result) {
          result.should.have.length(0);
          done();
        });
      });
    });
  });

  it("removes the whole list when start > end", function(done) {
    r.rpush(testKey, 1, 2, 3, 4, 5, function(err, result) {
      r.ltrim(testKey, 3, 2, function(err, result) {
        result.should.equal('OK');
        r.lrange(testKey, 0, 4, function(err, result) {
          result.should.have.length(0);
          done();
        });
      });
    });
  });

  it("trims correctly for positive numbers", function(done) {
    r.rpush(testKey, 1, 2, 3, 4, 5, function(err, result) {
      r.ltrim(testKey, 0, 2, function(err, result) {
        result.should.equal('OK');
        r.lrange(testKey, 0, 2, function(err, result) {
          // result.should.have.length(3);
          result.should.be.eql(["1", "2", "3"]);
          done();
        });
      });
    });
  });

  it("trims correctly for negative numbers", function(done) {
    r.rpush(testKey, 1, 2, 3, 4, 5, function(err, result) {
      r.ltrim(testKey, -2, -1, function(err, result) {
        result.should.equal('OK');
        r.lrange(testKey, 0, 2, function(err, result) {
          // result.should.have.length(3);
          result.should.be.eql(["4", "5"]);
          done();
        });
      });
    });
  });

  it("trims correctly for end > len", function(done) {
    r.rpush(testKey2, 1, 2, 3, 4, 5, function(err, result) {
      r.ltrim(testKey2, 1, 5, function(err, result) {
        result.should.equal('OK');
        r.lrange(testKey2, 0, 8, function(err, result) {
          // result.should.have.length(3);
          result.should.be.eql(["2", "3", "4", "5"]);
          done();
        });
      });
    });
  });

  it("trims correctly for one negativ number", function(done) {
    r.rpush(testKey3, 1, 2, 3, 4, 5, function(err, result) {
      r.ltrim(testKey3, 1, -1, function(err, result) {
        result.should.equal('OK');
        r.lrange(testKey3, 0, 5, function(err, result) {
          // result.should.have.length(3);
          result.should.be.eql(["2", "3", "4", "5"]);
          done();
        });
      });
    });
  });
});
