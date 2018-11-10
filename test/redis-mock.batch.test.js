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

describe("batch()", function () {
  it("should exist", function () {
    should.exist(r.batch);
  });

  it("should have get and set, etc", function () {
    var batch = r.batch();
    should.exist(batch.get);
    should.exist(batch.set);
    should.exist(batch.GET);
    should.exist(batch.SET);
    should.exist(batch.exists);
    should.exist(batch.hget);
  });

  describe("exec()", function () {
    it("should handle empty queues", function (done) {
      var batch = r.batch();
      batch.exec(function (err, results) {
        should(err).not.be.ok();
        should.deepEqual(results, []);
        done();
      });
    });

    it("should handle things without errors and callbacks", function (done) {
      var batch = r.batch();
      batch.get('foo').incr('foo');

      r.set('foo', 3, function () {
        batch.exec(function (err, results) {
          should(err).not.be.ok();
          should.deepEqual(results, ['3',4]);
          done();
        });
      });
    });

    it("should handle an array of commands", function (done) {
      r.set('foo', 3, function () {
        r.batch([
          ['get', 'foo'],
          ['incr', 'foo']
        ]).exec(function (err, results) {
          should(err).not.be.ok();
          should.deepEqual(results, ['3',4]);
          done();
        });
      });
    });

    it("should handle extraneous callbacks", function (done) {
      var batch = r.batch();
      batch.get('foo1').incr('foo1', function (err, result) {
        should.equal(result, 1);
        done();
      })
      batch.exec();
    });

    it("should run sorted set operations in order", function (done) {
      r.zadd('myzset', 1, 'a');
      r.zadd('myzset', 2, 'b');
      r.batch().
        zremrangebyscore('myzset', 0, 1).
        zadd('myzset', 'NX', 3, 'a').
        exec(function (err, result) {
          should(err).not.be.ok();
          should.deepEqual(result, [1, 1]);
          done();
        });
    });

    it("should run atomically with its own callbacks", function (done) {
      var batch = r.batch();
      batch.set('key', 0, function() {
        r.set('key', 0)
      });
      batch.incr('key', function() {
        r.incr('key');
      });
      batch.exec(function() {
        r.get('key', function(err, value) {
          value.should.eql('1')
          done();
        });
      });
    });
  });

  describe("discard()", function () {
    it("should properly discard the command queue", function (done) {
      r.set('foo', 3, function() {
        var batch = r.batch();
        batch.incr('foo', function () {
          // Discarded queues aren't calling their callbacks.
          should.not.be.ok(true);
        })
        batch.discard();
        r.get('foo', function (err, value) {
          value.should.eql('3');
          done();
        });
      });
    });

    it("should not allow to re-run the command queue", function (done) {
      var batch = r.batch();
      batch.discard();
      batch.exec(function (err, value) {
        should(err).be.null();
        value.should.have.length(1);
        (value[0]).should.be.Error();
        done();
      });
    });
  });
});
