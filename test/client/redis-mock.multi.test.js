var should = require("should");
var events = require("events");
var helpers = require("../helpers");

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

    should.exist(multi.setex);
    should.exist(multi.ttl);
    should.exist(multi.incr);
    should.exist(multi.renamenx);
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

    it("multi renamenx should work", function (done) {
      var key = 'my_key';
      var tempKey = 'temp:' + key;
      var realKey = 'real:' + key;
      r.multi().setex(tempKey, 60, 0)
        .renamenx(tempKey, realKey)
        .incr(realKey)
        .ttl(realKey)
        .exec(function(err, results) {
          should(err).not.be.ok();
          should(results[0]).equal('OK');
          should(results[1]).equal(1);
          should(results[2]).equal(1);
          (results[3]<= 60 ).should.be.true();
          done();
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

    it("should handle del with multiple keys", function () {
      const cmds = [
        [
          'del',
          'mediasoup:rooms:wipe-room-state-restart:routers:30070704-f47a-40bd-ab44-36534e56b4cc'
        ],
        [
          'srem',
          'mediasoup:rooms:wipe-room-state-restart:servers',
          'b5ZizudER5rxZffc6RUrG'
        ],
        [
          'hdel',
          'mediasoup:rooms:wipe-room-state-restart:producers:b55b81d8-0dfb-4bb8-846d-55e9474d12b6',
          'router'
        ],
        [
          'srem',
          'mediasoup:rooms:wipe-room-state-restart:producers',
          'b55b81d8-0dfb-4bb8-846d-55e9474d12b6'
        ],
        [
          'hdel',
          'mediasoup:rooms:wipe-room-state-restart:producers:c5d11e21-c69d-4b1f-a083-c98efc03a74c',
          'router'
        ],
        [
          'srem',
          'mediasoup:rooms:wipe-room-state-restart:producers',
          'c5d11e21-c69d-4b1f-a083-c98efc03a74c'
        ],
        [
          'hdel',
          'mediasoup:rooms:wipe-room-state-restart:producers:532fcd12-2a8b-47fb-8070-d2f89f9b4da3',
          'router'
        ],
        [
          'srem',
          'mediasoup:rooms:wipe-room-state-restart:producers',
          '532fcd12-2a8b-47fb-8070-d2f89f9b4da3'
        ],
        [
          'hdel',
          'mediasoup:rooms:wipe-room-state-restart:producers:ac517e34-9ca5-4439-95a7-1e0a9ca10439',
          'router'
        ],
        [
          'srem',
          'mediasoup:rooms:wipe-room-state-restart:producers',
          'ac517e34-9ca5-4439-95a7-1e0a9ca10439'
        ],
        [
          'del',
          'mediasoup:servers:b5ZizudER5rxZffc6RUrG:address',
          'mediasoup:servers:b5ZizudER5rxZffc6RUrG:rooms',
          'mediasoup:servers:b5ZizudER5rxZffc6RUrG:routers',
          'mediasoup:servers:b5ZizudER5rxZffc6RUrG:routers:30070704-f47a-40bd-ab44-36534e56b4cc:room',
          'mediasoup:servers:b5ZizudER5rxZffc6RUrG:producers',
          'mediasoup:servers:b5ZizudER5rxZffc6RUrG:producers:b55b81d8-0dfb-4bb8-846d-55e9474d12b6:room',
          'mediasoup:servers:b5ZizudER5rxZffc6RUrG:producers:c5d11e21-c69d-4b1f-a083-c98efc03a74c:room',
          'mediasoup:servers:b5ZizudER5rxZffc6RUrG:producers:532fcd12-2a8b-47fb-8070-d2f89f9b4da3:room',
          'mediasoup:servers:b5ZizudER5rxZffc6RUrG:producers:ac517e34-9ca5-4439-95a7-1e0a9ca10439:room'
        ],
        [
          'sadd',
          'mediasoup:servers',
          'b5ZizudER5rxZffc6RUrG'
        ],
        [
          'set',
          'mediasoup:servers:b5ZizudER5rxZffc6RUrG:address',
          '["1.0.0.0","2.0.0.0","127.0.0.1","JwX7Cju07gNJIII1K7bXc"]'
        ]
      ];
      return new Promise((resolve, reject) => {
        r.multi(cmds).exec((err, result) => {
          if (err) {
            return reject(err);
          }
          resolve(result);
        });
      });
    });

    it("should handle extraneous callbacks", function (done) {
      var multi = r.multi();
      multi.get('foo1').incr('foo1', function (err, result) {
        should.equal(result, 1);
        done();
      });
      multi.exec();
    });

    it("should run sorted set operations in order", function (done) {
      r.zadd('myzset', 1, 'a');
      r.zadd('myzset', 2, 'b');
      r.multi()
        .zremrangebyscore('myzset', 0, 1)
        .zadd('myzset', 'NX', 3, 'a')
        .exec(function (err, result) {
          should(err).not.be.ok();
          should.deepEqual(result, [1, 1]);
          done();
        });
    });

    it("should run atomically with its own callbacks", function (done) {
      var multi = r.multi();
      multi.set('key', 0, function() {
        r.set('key', 0);
      });
      multi.incr('key', function() {
        r.incr('key');
      });
      multi.exec(function() {
        r.get('key', function(err, value) {
          value.should.eql('1');
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
        var multi = r.multi();
        multi.incr('foo', function () {
          // Discarded queues aren't calling their callbacks.
          should.not.be.ok(true);
        });
        multi.discard();
        r.get('foo', function (err, value) {
          value.should.eql('3');
          done();
        });
      });
    });

    it("should now allow to re-run the command queue", function (done) {
      var multi = r.multi();
      multi.discard();
      multi.exec(function (err, value) {
        should(value).not.be.ok();
        err.should.be.ok();
        done();
      });
    });
  });
});
