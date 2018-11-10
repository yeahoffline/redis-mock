var helpers = require("./helpers");
var should = require("should");
var events = require("events");

var r;

beforeEach(function () {
  r = helpers.createClient();
});

afterEach(function (done) {
  r.flushall();
  r.quit(done);
});

describe("basic hashing usage", function () {

  var testHash = "myHash";
  var testKey = "myKey";
  var testValue = "myValue";

  var testKeyNotExist = "myKeyNonExistant";
  var testKeyEmptyString = "myKeyEmptyString";
  var testValueEmptyString = "";

  it("should not say that non-existant values exist", function (done) {

    r.hexists(testHash, testKey, function (err, result) {
      result.should.equal(0);

      done();

    });

  });

  it("should set a value", function (done) {

    r.hset(testHash, testKey, testValue, function (err, result) {

      result.should.equal(1);

      done();

    });

  });

  it("should toString on non-string values", function (done) {
    var testArray = [1,2,3];

    r.hset(testHash, testKey, testArray, function (err, result) {

      r.hget(testHash, testKey, function (err, result) {

        result.should.equal(testArray.toString());

        done();

      });

    });

  });

  it("should treat empty string as existent", function (done) {
    r.hset(testHash, testKeyEmptyString, testValueEmptyString, function (err, result) {
      r.hexists(testHash, testKeyEmptyString, function (err, result) {
        result.should.equal(1);

        done();
      });
    });
  });

  describe("more complex set/get/exist...", function () {

    beforeEach(function (done) {
      r.hset(testHash, testKey, testValue, function (err, result) {

        done();

      });
    });

    it("should refuse to get a string from an hash", function (done) {

      r.get(testHash, function (err, result) {
        should.not.exist(result);

        err.message.should.equal("WRONGTYPE Operation against a key holding the wrong kind of value");

        done();
      });
    });

    it("should set a value in an existing hash and say it already existed", function (done) {

      r.hset(testHash, testKey, testValue, function (err, result) {

        result.should.equal(0);

        done();

      });

    });

    it("should get a value that has been set", function (done) {

      r.hget(testHash, testKey, function (err, result) {

        result.should.equal(testValue);

        done();

      });

    });

    it("should not get a value that has not been set", function (done) {

      r.hget(testHash, testKeyNotExist, function (err, result) {

        should.not.exist(result);

        done();

      });

    });

    it("should say that set value exists", function (done) {

      r.hexists(testHash, testKey, function (err, result) {

        result.should.equal(1);

        done();

      });

    });

    it("should delete a value", function (done) {

      r.hdel(testHash, testKey, function (err, result) {

        result.should.equal(1);

        done();

      });

    });

    it("should not get a value that has been deleted", function (done) {

      r.hdel(testHash, testKey, function (err, result) {
        r.hget(testHash, testKey, function (err, result) {

          should.not.exist(result);

          done();

        });
      });
    });

    it("should not say that deleted value exists", function (done) {

      r.hdel(testHash, testKey, function (err, result) {
        r.hexists(testHash, testKey, function (err, result) {

          result.should.equal(0);

          done();

        });
      });

    });

    it("should return length 0 when key does not exist", function (done) {

      r.hlen("newHash", function (err, result) {

        result.should.equal(0);

        done();

      });
    });

    it("should return length when key exists", function (done) {

      r.hlen(testHash, function (err, result) {

        result.should.equal(1);

        r.hset(testHash, testKey + "2", testValue, function (err, result) {

          r.hlen(testHash, function (err, result) {

            result.should.equal(2);

            done();

          });

        });
      });
    });
  });

});

describe("hincrby", function () {

  var testHash = "myHashToIncr";
  var testKey = "myKeyToIncr";

  it("should increment an attribute of the hash", function (done) {

    r.hincrby(testHash, testKey, 2, function (err, result) {
      result.should.equal(2);

      r.hget(testHash, testKey, function (err, result) {
        result.should.equal("2");
        done();
      });
    });

  });

});

describe("hincrbyfloat", function () {

  var testHash = "myHashToIncrFloat";
  var testKey = "myKeyToIncrFloat";
  var testKey2 = "myKeyToIncrFloat2";

  var num = 2.591;
  var x2 = num * 2;

  it("should increment an attribute of the hash", function (done) {

    r.hincrbyfloat(testHash, testKey, num, function (err, result) {
      result.should.equal(num.toString());

      r.hget(testHash, testKey, function (err, result) {
        result.should.equal(num.toString());
        done();
      });
    });

  });

  it("should double increment an attribute of the hash", function (done) {

    r.hincrbyfloat(testHash, testKey2, num, function (err, result) {
      result.should.equal(num.toString());

      r.hincrbyfloat(testHash, testKey2, num, function (err, result) {
          result.should.equal(x2.toString());

          r.hget(testHash, testKey2, function (err, result) {
              result.should.equal(x2.toString());

              done();
          });
        });
    });

  });


});



describe("hsetnx", function () {

  var testHash = "myHashSetNx";
  var testKey = "myKey";
  var testValue = "myValue";
  var testKey2 = "myKey2";
  var testValue2 = "myNewTestValue";

  beforeEach(function (done) {
    r.hset(testHash, testKey, testValue, function (err, result) {

      done();

    });
  });

  it("should set a value that does not exist", function (done) {

    r.hsetnx(testHash, testKey2, testValue, function (err, result) {

      result.should.equal(1);

      done();

    });

  });

  it("should not set a value that does exist", function (done) {

    r.hsetnx(testHash, testKey, testValue2, function (err, result) {

      result.should.equal(0);

      r.hget(testHash, testKey, function (err, result) {

        result.should.not.equal(testValue2);

        result.should.equal(testValue);

        done();

      });

    });

  });

});


//HSCAN
describe("hscan", function () {

  var testHash = "myScanHash";
  var testKey1 = "myKey";
  var testValue1 = "myValue";
  var testKey2 = "myKey2XXYYZZ";
  var testValue2 = "myNewTestValue";

  beforeEach(function (done) {
    r.hset(testHash, testKey1, testValue1, function (err, result) {
      r.hset(testHash, testKey2, testValue2, function (err, result) {
        done();
      });
    });
  });


  it("should return empty results on missing hscan hash", function (done) {
    var index = 0;
      r.hscan("non-existent-hash", index, 'match', '*', 'count', 1000, function (err, indexAndKeys) {
        if(err) {
          done(err);
          return;
        }
        index = indexAndKeys[0];
        index.should.be.equal('0');

        var keys = indexAndKeys[1];
        keys.should.be.instanceof(Array);
        keys.should.have.length(0);
        done();

      });
  });


  it("should hscan find hash keys - *", function (done) {
    var keys = [];
    var index = 0;

    var loop = function() {
      r.hscan(testHash, index, 'count', 1000, function (err, indexAndKeys) {
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
          keys.should.containEql(testKey1);
          keys.should.containEql(testValue1);
          keys.should.containEql(testKey2);
          keys.should.containEql(testValue2);
          keys.should.have.length(4);
          index.should.be.equal('0');
          done();
        }
      });
    };
    loop();
  });

  it("should hscan hash keys with a pattern - *XXYYZZ*", function (done) {
    var keys = [];
    var index = 0;
    var loop = function() {
      r.hscan(testHash, index, 'match', '*XXYYZZ*', 'count', 1000, function (err, indexAndKeys) {
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
          keys.should.containEql(testKey2);
          keys.should.containEql(testValue2);
          keys.should.have.length(2);
          index.should.be.equal('0');
          done();
        }
      });
    };
    loop();
  });
});

describe("multiple get/set", function () {

  var mHash = "mHash";
  var mHash2 = "mHash2";
  var mHash3 = "mHash3";
  var mHash4 = "mHash4";
  var mHashEmpty = "mHashEmpty";
  var mKey1 = "mKey1";
  var mKey2 = "mKey2";
  var mKey3 = "mKey3";
  var mKey4 = "mKey4";
  var mValue1 = "mValue1";
  var mValue2 = "mValue2";
  var mValue3 = "mValue3";
  var mValue4 = "mValue4";

  beforeEach(function (done) {
    r.hset(mHash2, mKey1, mValue1, function () {
      r.hset(mHash2, mKey2, mValue2, function () {
        r.hset(mHash2, mKey3, mValue3, function () {
          r.hset(mHash2, mKey4, mValue4, function () {
            done();
          });
        });
      });
    });
  });

  // HMSET
  it("should be able to set multiple keys as multiple arguments", function (done) {

    r.hmset(mHash, mKey1, mValue1, mKey2, mValue2, function (err, result) {

      result.should.equal("OK");

      done();

    });
  });
  it("should be able to set multiple keys as array", function (done) {

    r.hmset(mHash, [mKey1, mValue1, mKey2, mValue2], function (err, result) {

      result.should.equal("OK");

      done();

    });
  });

  it("should be able to set hash and multiple keys as array", function (done) {

    r.hmset([mHash, mKey1, mValue1, mKey2, mValue2], function (err, result) {

      result.should.equal("OK");

      done();

    });
  });
  it("should be able to set multiple keys as an object", function (done) {


    r.hmset(mHash, { mKey3: mValue3, mKey4: mValue4}, function (err, result) {

      result.should.equal("OK");

      done();

    });

  });

  it("should be able to set multiple keys using hash,array", function (done) {

    r.hmset(mHash3, [mKey1, mValue1, mKey2, mValue2], function (err, result) {

      result.should.equal("OK");

      done();

    });

  });

  it("should be able to set multiple keys using array", function (done) {

    r.hmset([mHash4, mKey1, mValue1, mKey2, mValue2], function (err, result) {

      result.should.equal("OK");

      done();

    });

  });

  // HMGET
  it("should be able to get multiple keys as multiple arguments", function (done) {

    r.hmset(mHash, { mKey3: mValue3, mKey4: mValue4});
    r.hmget(mHash2, mKey1, mKey2, function (err, result) {

      result.should.be.an.Array().and.have.lengthOf(2);
      result.should.eql([mValue1, mValue2]);

      done();

    });
  });

  it("should delete multiple keys as multiple arguments", function (done) {

    r.hdel(mHash2, mKey1, mKey2, function (err, result) {

      result.should.equal(2);

      done();

    });
  });

  it("should return array of null values if key doesn't exist", function (done) {

    r.hmget("random", mKey1, mKey2, function (err, result) {
      result.should.be.an.Array().and.have.lengthOf(2);
      result.should.eql([null, null]);

      done();
    });
  });

  it("should return null for undefined keys and correct value for defined key", function (done) {

    r.hmget(mHash2, mKey1, "random", function (err, result) {
      result.should.be.an.Array().and.have.lengthOf(2);
      result.should.eql([mValue1, null]);

      done();
    });
  });

  //HKEYS
  it("should be able to get all keys for hash", function (done) {

    r.hkeys(mHash2, function (err, result) {

      result.indexOf(mKey1).should.not.equal(-1);
      result.indexOf(mKey2).should.not.equal(-1);
      result.indexOf(mKey3).should.not.equal(-1);
      result.indexOf(mKey4).should.not.equal(-1);

      done();

    });

  });

  //HVALS
  it("should be able to get all vals for hash", function (done) {

    r.hvals(mHash2, function (err, result) {

      result.should.containEql(mValue1);
      result.should.containEql(mValue2);
      result.should.containEql(mValue3);
      result.should.containEql(mValue4);

      done();

    });

  });

  //HGETALL
  it("should be able to get all values for hash", function (done) {

    r.hgetall(mHash2, function (err, result) {

      should.exist(result);

      result.should.have.property(mKey1, mValue1);
      result.should.have.property(mKey2, mValue2);
      result.should.have.property(mKey3, mValue3);
      result.should.have.property(mKey4, mValue4);

      done();
    });
  });

  it("should return null on a non existing hash", function (done) {
    r.hgetall(mHashEmpty, function (err, result) {

      should.not.exist(result);

      done();
    });
  });

});
