var should = require("should");
var events = require("events");
var helpers = require("./helpers");
var redismock = require("../");

// Clean the db after each test
afterEach(function (done) {
  var r = helpers.createClient();
  r.flushdb(function () {
    r.end(true);
    done();
  });
});

describe("redis-mock", function () {

  it("should create an instance of RedisClient which inherits from EventEmitter", function (done) {

    should.exist(redismock.createClient);

    var r = redismock.createClient();
    should.exist(r);
    r.should.be.an.instanceof(redismock.RedisClient);
    r.should.be.an.instanceof(events.EventEmitter);

    r.quit(done);

  });

  it("should create a new RedisClient with duplicate(), not using callback", function(done) {
    should.exist(redismock.createClient);
    var r = redismock.createClient();
    should.exist(r);
    r.should.be.an.instanceof(redismock.RedisClient);
    r.should.be.an.instanceof(events.EventEmitter);

    var r2 = r.duplicate();
    should.exist(r2);
    r2.should.be.an.instanceof(redismock.RedisClient);
    r2.should.be.an.instanceof(events.EventEmitter);

    r.quit(function (err) {
      if (err) {
        should.fail(err, null, "Expected null error.", "");
      }
      r2.quit(done);
    });
  });

  it("should create a new RedisClient with duplicate(), using the callback", function(done) {
    should.exist(redismock.createClient);
    var r = redismock.createClient();
    should.exist(r);
    r.should.be.an.instanceof(redismock.RedisClient);
    r.should.be.an.instanceof(events.EventEmitter);

    r.duplicate(null, function (err, r2) {
      if (err) {
        should.fail(err, null, "Expected null error.", "");
      }
      should.exist(r2);
      r2.should.be.an.instanceof(redismock.RedisClient);
      r2.should.be.an.instanceof(events.EventEmitter);

      r.quit(function (err) {
        if (err) {
          should.fail(err, null, "Expected null error.", "");
        }
        r2.quit(done);
      })
    });
  });

  it("should emit ready and connected when creating client", function (done) {

    var r = redismock.createClient();

    var didEmitOther = true;
    var didOtherPassed = false

    r.on("ready", function () {

      if (didEmitOther && !didOtherPassed) {

        didOtherPassed = true;

        r.quit(done);

      }

    });

    r.on("connect", function () {

      if (didEmitOther && !didOtherPassed) {

        didOtherPassed = true;

        r.quit(done);

      }

    });

  });

  it("should have '.connected' boolean property that reflects 'ready' state", function (done) {

    var r = redismock.createClient();

    r.connected.should.be.an.instanceof(Boolean);
    r.connected.should.eql(false);
    r.on("ready", function () {
      r.connected.should.eql(true);
    });
    r.quit(done);
  });


  it("should not be connected after end() is called", function (done) {

    var r = redismock.createClient();

    r.on("connect", function () {
      r.connected.should.eql(true);

      r.quit(function (err) {
        if (err) {
          should.fail(err, null, "Expected null error.", "");
        }
        r.connected.should.eql(false);
        done();
      });
    });

  });

  it("should have function end() that emits event 'end'", function (done) {

    var r = redismock.createClient();

    r.on("end", function () {

      done();

    });

    r.quit();

  });

});
