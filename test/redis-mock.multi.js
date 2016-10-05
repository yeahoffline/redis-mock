var redismock = require("../")
var should = require("should")
var events = require("events");

if (process.env['VALID_TESTS']) {
  redismock = require('redis');
}

describe("multi()", function () {
  var r = redismock.createClient();

  it("should exist", function () {
    should.exist(r.multi);
  });

  it("should have get and set, etc", function () {
    var multi = r.multi();
    should.exist(multi.get);
    should.exist(multi.set);
    should.exist(multi.GET);
    should.exist(multi.SET);
    should.exist(multi.exists);
    should.exist(multi.hget);
  });

  describe("exec()", function () {
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
        var mulit = r.multi([
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
      }).exec();
    });

  });
});
