var should = require('should');
var helpers = require('./helpers');

var r;

beforeEach(function () {
  r = helpers.createClient();
});

afterEach(function (done) {
  r.flushall();
  r.quit(done);
});

describe('sadd', function () {

  it('should add a member to the set', function (done) {
    r.sadd('foo', 'bar', function (err, result) {
      result.should.eql(1);

      r.smembers('foo', function (err, result) {
        result.should.eql(['bar']);

        done();
      });
    });
  });

  it('should add members to the set', function (done) {
    r.sadd('foo', 'bar', 'baz', 'qux', function (err, result) {
      result.should.eql(3);

      r.smembers('foo', function (err, result) {
        result.should.be.instanceof(Array);
        result.should.have.length(3);
        result.should.containEql('bar');
        result.should.containEql('baz');
        result.should.containEql('qux');

        done();
      });
    });
  });

  it('should ignore members that are already a member of the set', function (done) {
    r.sadd('foo', 'bar', 'bar', 'baz', function (err, result) {
      result.should.eql(2);

      r.sadd('foo', 'baz', function (err, result) {
        result.should.eql(0);

        r.smembers('foo', function (err, result) {
          result.should.be.instanceof(Array);
          result.should.have.length(2);
          result.should.containEql('bar');
          result.should.containEql('baz');

          done();
        });
      });
    });
  });

  it('should return error when the value stored at the key is not a set', function (done) {

    r.hset('foo', 'bar', 'baz', function (err, result) {

      r.sadd('foo', 'bar', function (err, result) {
        err.message.should.eql('WRONGTYPE Operation against a key holding the wrong kind of value');

        done();
      });
    });
  });

  it('should support arguments as array', function (done) {
    r.sadd('foo', ['bar', 'baz'], function (err, result) {
      result.should.eql(2);

      r.smembers('foo', function (err, result) {
        result.should.be.instanceof(Array);
        result.should.have.length(2);
        result.should.containEql('bar');
        result.should.containEql('baz');

        done();
      });
    });
  });

  it('should support arguments without callback', function (done) {
    r.sadd('foo', 'bar', 'baz');
    r.smembers('foo', function (err, result) {
      result.should.be.instanceof(Array);
      result.should.have.length(2);
      result.should.containEql('bar');
      result.should.containEql('baz');

      done();
    });
  });

});

describe('srem', function () {

  it('should remove a member from the set', function (done) {
    r.sadd('foo', 'bar', 'baz', 'qux', function (err, result) {

      r.srem('foo', 'bar', function (err, result) {
        result.should.eql(1);

        r.smembers('foo', function (err, result) {
          result.should.be.instanceof(Array);
          result.should.have.length(2);
          result.should.containEql('baz');
          result.should.containEql('qux');

          done();
        });
      });
    });
  });

  it('should remove members from the set', function (done) {
    r.sadd('foo', 'bar', 'baz', 'qux', function (err, result) {

      r.srem('foo', 'bar', 'baz', function (err, result) {
        result.should.eql(2);

        r.smembers('foo', function (err, result) {
          result.should.be.instanceof(Array);
          result.should.have.length(1);
          result.should.eql([ 'qux']);

          done();
        });
      });
    });
  });

  it('should ignore members that are not a member of the set', function (done) {
    r.sadd('foo', 'bar', function (err, result) {

      r.srem('foo', 'bar', 'baz', function (err, result) {
        result.should.eql(1);

        r.smembers('foo', function (err, result) {
          result.should.eql([]);

          done();
        });
      });
    });
  });

  it('should return 0 if the key does not exist', function (done) {
    r.sadd('foo', 'bar', function (err, result) {

      r.srem('baz', 'qux', function (err, result) {
        result.should.eql(0);

        done();
      });
    });
  });

  it('should return error when the value stored at the key is not a set', function (done) {
    r.hset('foo', 'bar', 'baz', function (err, result) {

      r.srem('foo', 'bar', function (err, result) {
        err.message.should.eql('WRONGTYPE Operation against a key holding the wrong kind of value');

        done();
      });
    });
  });

  it('should support arguments as array', function (done) {
    r.sadd('foo', 'bar', 'baz', function (err, result) {
      r.srem('foo', ['bar', 'baz']);
      r.smembers('foo', function (err, result) {
        result.should.be.instanceof(Array);
        result.should.have.length(0);

        done();
      });
    });
  });

  it('should support arguments without callback', function (done) {
    r.sadd('foo', 'bar', 'baz', function (err, result) {
      r.srem('foo', 'bar', 'baz');
      r.smembers('foo', function (err, result) {
        result.should.be.instanceof(Array);
        result.should.have.length(0);

        done();
      });
    });
  });

});

describe('sismember', function () {

  it('should test if member exists', function (done) {
    r.sadd('foo2', 'bar', 'baz', 'qux', function (err, result) {
      r.sismember('foo2', 'bar', function (err, result) {
        result.should.eql(1);
        done();
      });
    });
  });

  it('should return 0 if member does not exist', function(done) {
    r.sadd('foo2', 'bar', 'baz', function (err, result) {
      r.sismember('foo2', 'qux', function(err, result) {
        result.should.eql(0);
        done();
      });
    });
  });

  it('should return 0 if key is not set', function(done) {
    r.sismember('foo3', 'bar', function(err, result) {
      result.should.eql(0);
      done();
    });
  });

});

// TODO: Add tests of SMEMBERS

describe('smembers', function () {

  it('should return the empty array', function (done) {
    r.smembers("foo", function (err, result) {
      result.should.be.instanceof(Array);
      result.should.have.length(0);
      done();
    })
  });

  it('should return the empty array when all members removed from set', function (done) {
    r.sadd('foo', 'bar', function (err, result) {
      r.srem('foo', 'bar', function (err, result) {
        r.smembers('foo', function (err, result) {
          result.should.be.instanceof(Array);
          result.should.have.length(0);
          done();
        });
      });
    });
  });
});

describe('scard', function () {

  it('should return the number of elements', function (done) {
    r.sadd('foo', 'bar', 'baz', function (err, result) {
      r.scard('foo', function (err, result) {
        result.should.eql(2);
        done();
      });
    });
  });

  it('should return 0 if key does not exist', function (done) {
    r.sadd('foo', 'bar', 'baz', function (err, result) {
      r.scard('qux', function (err, result) {
        result.should.eql(0);
        done();
      });
    });
  });

  it('should return error when the value stored at the key is not a set', function (done) {
    r.hset('foo', 'bar', 'baz', function (err, result) {
      r.scard('foo', function (err, result) {
        err.message.should.eql('WRONGTYPE Operation against a key holding the wrong kind of value');
        done();
      });
    });
  });

});

describe('srandmember', function () {

  it('should return a string from a set', function (done) {
    r.sadd('foo', 'bar', 'baz', function (err, result) {
      r.srandmember('foo', function (err, result) {
        ['bar', 'baz'].should.containEql(result);
        done();
      });
    });
  });

  it('should return an array from a set if a length param is provided', function (done) {
    r.sadd('foo', 'bar', 'baz', 'bazing', function (err, result) {
      r.srandmember('foo', 2, function (err, result) {
        result.should.have.length(2);
        done();
      });
    });

  });

  it('should return an array that does not exceed the size of the set', function (done) {
    r.sadd('foo', 'bar', 'baz', function (err, result) {
      r.srandmember('foo', 3, function (err, result) {
        result.should.have.length(2);
        done();
      });
    });
  });

  it('should return null if the key does not exist and no length is provided', function (done) {
    r.sadd('foo', 'bar', 'baz', function (err, result) {
      r.srandmember('qux', function (err, result) {
        should(result).be.null();
        done();
      });
    });
  });

  it('should return an empty array if the key does not exist and a length is provided', function (done) {
    r.srandmember('foo', 2, function (err, result) {
      should(result).be.Array();
      done();
    });
  });

  it('should return error when the value stored at the key is not a set', function (done) {
    r.hset('foo', 'bar', 'baz', function (err, result) {
      r.srandmember('foo', function (err, result) {
        err.message.should.eql('WRONGTYPE Operation against a key holding the wrong kind of value');
        done();
      });
    });
  });

});

describe('smove', function () {

  it('should remove the element from the source if it exists', function (done) {
    r.sadd('foo', 'baz', 'qux', function (err, result) {

      r.smove('foo', 'bar', 'baz', function (err, result) {
        result.should.eql(1);

        r.smembers('foo', function (err, result) {
          result.should.be.instanceof(Array);
          result.should.have.length(1);
          result.should.containEql('qux');

          done();
        });
      });
    });
  });

  it('should add the element to the destination if it exists', function (done) {
    r.sadd('foo', 'baz', 'qux', function (err, result) {
      r.sadd('bar', 'qux', function (err, result) {

        r.smove('foo', 'bar', 'baz', function (err, result) {
          result.should.eql(1);

          r.smembers('bar', function (err, result) {
            result.should.be.instanceof(Array);
            result.should.have.length(2);
            result.should.containEql('qux');
            result.should.containEql('baz');

            done();
          });
        });
      });
    });
  });

  it('should add the element to the destination if it does not exist', function (done) {
    r.sadd('foo', 'baz', 'qux', function (err, result) {

      r.smove('foo', 'bar', 'baz', function (err, result) {
        result.should.eql(1);

        r.smembers('bar', function (err, result) {
          result.should.be.instanceof(Array);
          result.should.have.length(1);
          result.should.containEql('baz');

          done();
        });
      });
    });
  });

  it('should do nothing if the element is not a member of source', function (done) {
    r.sadd('foo', 'baz', function (err, result) {
      r.sadd('bar', 'quux', function(err, result) {

        r.smove('foo', 'baz', 'qux', function (err, result) {
          result.should.eql(0);

          r.smembers('bar', function (err, result) {
            result.should.be.instanceof(Array);
            result.should.have.length(1);
            result.should.containEql('quux');

            r.smembers('foo', function(err, result) {
              result.should.be.instanceof(Array);
              result.should.have.length(1);
              result.should.containEql('baz');
              done();
            });
          });
        });
      });
    });
  });

  it('should return error when the value stored at the source key is not a set', function (done) {
    r.hset('foo', 'baz', 'qux', function (err, result) {

      r.smove('foo', 'bar', 'baz', function (err, result) {
        err.message.should.eql('WRONGTYPE Operation against a key holding the wrong kind of value');

        done();
      });
    });
  });

  it('should return error when the value stored at the destination key is not a set', function (done) {
    r.sadd('foo', 'baz', function (err, result) {
      r.hset('bar', 'baz', 'qux', function (err, result) {

        r.smove('foo', 'bar', 'baz', function (err, result) {
          err.message.should.eql('WRONGTYPE Operation against a key holding the wrong kind of value');

          done();
        });

      });
    });
  });

  it('should ignore members that are already a member of the set', function (done) {
    r.sadd('foo', 'baz', function (err, result) {
      r.sadd('bar', 'baz', function (err, result) {

        r.smove('foo', 'bar', 'baz', function(err, result) {
          result.should.eql(1);

          r.smembers('foo', function (err, result) {
            result.should.be.instanceof(Array);
            result.should.have.length(0);

            r.smembers('bar', function (err, result) {
              result.should.be.instanceof(Array);
              result.should.have.length(1);
              result.should.containEql('baz');

              done();
            });
          });
        });
      });
    });
  });

  it('should support arguments without callback', function (done) {
    r.sadd('foo', 'baz', function(err, result) {

      r.smove('foo', 'bar', 'baz');
      r.smembers('foo', function (err, result) {
        result.should.be.instanceof(Array);
        result.should.have.length(0);

        r.smembers('bar', function (err, result) {
          result.should.be.instanceof(Array);
          result.should.have.length(1);
          result.should.containEql('baz');

          done();
        });
      });
    });
  });
});
