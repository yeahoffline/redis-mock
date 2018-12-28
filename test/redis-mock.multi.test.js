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

describe("multi()", function () {
  it("should exist", function () {
    should.exist(r.multi);
  });

  it("should have get and set, etc", function () {
    var multi = r.multi();
    should.exist(multi.get);
    should.exist(multi.set);
    should.exist(multi.GET);
    should.exist(multi.SET);
    should.exist(multi.DECR);
    should.exist(multi.decrby);
    should.exist(multi.exists);
    should.exist(multi.hget);
    should.exist(multi.exec_atomic);
  });

  describe("exec()", function () {
    it("should handle empty queues", function (done) {
      var multi = r.multi();
      multi.exec(function (err, results) {
        should(err).not.be.ok();
        should.deepEqual(results, []);
        done();
      });
    });

    it("should handle things without errors and callbacks", function (done) {
      var multi = r.multi();
      multi.get('foo').incr('foo');

      r.set('foo', 3, function () {
        multi.exec(function (err, results) {
          should(err).not.be.ok();
          should.deepEqual(results, ['3',4]);
          done();
        });
      });
    });

    it("should handle an array of commands", function (done) {
      r.set('foo', 3, function () {
        r.multi([
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
      var multi = r.multi();
      multi.get('foo1').incr('foo1', function (err, result) {
        should.equal(result, 1);
        done();
      })
      multi.exec();
    });

    it("should run sorted set operations in order", function (done) {
      r.zadd('myzset', 1, 'a');
      r.zadd('myzset', 2, 'b');
      r.multi().
        zremrangebyscore('myzset', 0, 1).
        zadd('myzset', 'NX', 3, 'a').
        exec(function (err, result) {
          should(err).not.be.ok();
          should.deepEqual(result, [1, 1]);
          done();
        });
    });

    it("should run atomically with its own callbacks", function (done) {
      var multi = r.multi();
      multi.set('key', 0, function() {
        r.set('key', 0)
      });
      multi.incr('key', function() {
        r.incr('key');
      });
      multi.exec(function() {
        r.get('key', function(err, value) {
          value.should.eql('1')
          done();
        });
      });
    });

    it('should allow rpoplpush to work', function (done) {
      var key1 = 'a';
      var key2 = 'b';
      var val = 'myval';
      r.rpush(key1, val, function (err, result) {
        result.should.equal(1);
        var multi = r.multi();
        multi.rpoplpush(key1, key2);
        multi.exec(function (err, result) {
          should.deepEqual(result, [val]);
          r.lrange('b', 0, -1, function (err, result) {
            should.deepEqual(result, [val]);
            done();
          });
        });
      });
    });
  });

  describe("discard()", function () {
    it("should properly discard the command queue", function (done) {
      r.set('foo', 3, function() {
        var multi = r.multi()
        multi.incr('foo', function () {
          // Discarded queues aren't calling their callbacks.
          should.not.be.ok(true);
        })
        multi.discard();
        r.get('foo', function (err, value) {
          value.should.eql('3')
          done();
        });
      });
    });

    it("should now allow to re-run the command queue", function (done) {
      var multi = r.multi()
      multi.discard()
      multi.exec(function (err, value) {
        should(value).not.be.ok();
        err.should.be.ok();
        done();
      });
    });
  });
});
