var should = require("should");
var helpers = require("./helpers");

/**
  *** NOT IMPLEMENTED ***
  ZINTERSTORE destination numkeys key [key ...] [WEIGHTS weight [weight ...]] [AGGREGATE SUM|MIN|MAX]
  ZLEXCOUNT key min max
  ZRANGEBYLEX key min max [LIMIT offset count]
  ZREVRANGEBYLEX key max min [LIMIT offset count]
  ZREMRANGEBYLEX key min max
  ZUNIONSTORE destination numkeys key [key ...] [WEIGHTS weight [weight ...]] [AGGREGATE SUM|MIN|MAX]
  ZSCAN key cursor [MATCH pattern] [COUNT count]
*/

var r;

beforeEach(function () {
  r = helpers.createClient();
});

afterEach(function (done) {
  r.flushall();
  r.quit(done);
});

describe("zadd", function () {
  var testKey1 = "zaddKey1";
  var args = [
    1, 'm1',
    1.1, 'm1.1',
    1.2, 'm1.2',
    1.3, 'm1.3',
    1.4, 'm1.4',
    1.5, 'm1.5',
    2, 'm2',
    3, 'm3'
  ];

  var aLen = args.length;
  var mLen = aLen / 2;
  it("should add scores and members", function (done) {
    r.zadd([testKey1].concat(args), function(err, result) {
      result.should.equal(mLen);
      // should only add new members
      r.zadd([testKey1, 'nx', 1, 'm1', 0, 'm4'], function(err, result) {
        result.should.equal(1);

        // only update existing members
        // this won't bump the return count
        // because CH wasn't specified
        r.zadd([testKey1, 'xx', 6, 'm6', 1, 'm4'], function(err, result) {
          result.should.equal(0);

          // only update existing members and bump return count
          r.zadd([testKey1, 'xx', 'ch', 6, 'm6', 4, 'm4'], function(err, result) {
            result.should.equal(1);

            // update an existing score w/ incr;
            r.zadd([testKey1, 'xx', 'ch', 'incr', 1, 'm4'], function(err, result) {
              result.should.equal('5');
              done();
            });

          });

        });

      });

    });
  });

});

describe("zcard", function () {
  var testKey1 = "zcardKey1";
  var testScore1 = 1;
  var testMember1 = JSON.stringify({'a': 'b'});
  var testScore2 = 2;
  var testMember2 = '2';

  it("should add scores and members", function (done) {
    r.zadd(testKey1, testScore1, testMember1, testScore2, testMember2,
      function(err, result) {
        result.should.equal(2);

        r.zcard(testKey1, function(err, result) {
          result.should.equal(2);
          done();
        });
    });
  });
});

describe("zcount", function () {
  var testKey1 = "zcountKey1";
  var args = [
    1, 'm1',
    1.1, 'm1.1',
    1.2, 'm1.2',
    1.3, 'm1.3',
    1.4, 'm1.4',
    1.5, 'm1.5',
    2, 'm2',
    3, 'm3'
  ];

  var aLen = args.length;
  var mLen = aLen / 2;

  it("should return the inclusive min & max count", function (done) {
    r.zadd([testKey1].concat(args), function(err, result) {
      result.should.equal(mLen);

      r.zcount([testKey1, '0', '5'], function(err, result) {
        should(result).equal(mLen);
        done();
      });

    });
  });

});

describe("zincrby", function () {
  var testKey1 = "zincrbyKey1";
  var testKey2 = "zincrbyKey2";

  it("should add and increment a member", function (done) {
    r.zadd([testKey1,  1, 'm1'], function(err, result) {
      result.should.equal(1);
      r.zincrby([testKey1, 5, 'm1'], function(err, result) {
        should(result).equal('6');
        done();
      });
    });
  });

  it("should increment a non-existing member", function (done) {
    r.zincrby([testKey2, '5', 'm1'], function(err, result) {
      should(result).equal('5');

      r.zincrby([testKey2, '5', 'm1'], function(err, result) {
        should(result).equal('10');
        done();
      });
   });
  });

});

describe("zrange", function () {
  var testKey1 = "zrangeKey1";
  var testKey2 = "zrangeKey2";
  var testKey3 = "zrangeKey3";
  var testKey4 = "zrangeKey4";
  var testKey5 = "zrangeKey5";
  var args = [
    1, 'm1',
    2, 'm2',
    3, 'm3',
    1.1, 'm1.1',
    1.2, 'm1.2',
    1.3, 'm1.3',
    1.4, 'm1.4',
    1.5, 'm1.5'
  ];

  var aLen = args.length;
  var mLen = aLen / 2;

  it("should return everything withscores", function (done) {
    r.zadd([testKey1].concat(args), function(err, result) {
      result.should.equal(mLen);
      r.zrange([testKey1, '0', '-1', 'withscores'], function(err, result) {
        should(result[0]).equal('m1');
        should(result[1]).equal('1');
        should(result.length).equal(aLen);
        done();
      });
    });
  });

  it("should return the inclusive start & stop withscores", function (done) {
    r.zadd([testKey2].concat(args), function(err, result) {
      result.should.equal(mLen);
      r.zrange([testKey2, '1', '5', 'withscores'], function(err, result) {
        should(result[0]).equal('m1.1');
        // disable checking for floating
        // should(result[1]).equal('1.1');
        should(result.length).equal(5 * 2);
        done();
      });
    });
  });

  it("should return everything without scores", function (done) {
    r.zadd([testKey3].concat(args), function(err, result) {
      r.zrange([testKey3, '0', '-1'], function(err, result) {
        should(result[0]).equal('m1');
        should(result[1]).equal('m1.1');
        should(result.length).equal(mLen);
        done();
      });
    });
  });

  it("should return the inclusive start & stop without scores", function (done) {
    r.zadd([testKey4].concat(args), function(err, result) {
      result.should.equal(mLen);
      r.zrange([testKey4, '1', '5'], function(err, result) {
        should(result[0]).equal('m1.1');
        should(result[1]).equal('m1.2');
        should(result.length).equal(5);
        done();
      });
    });
  });

  it("should return last two members", function (done) {
    r.zadd([testKey5].concat(args), function(err, result) {
      r.zrange([testKey5, '-2', '-1'], function(err, result) {
        should(result[0]).equal('m2');
        should(result[1]).equal('m3');
        should(result.length).equal(2);
        done();
      });
    });
  });

});

describe("zrangebyscore", function () {
  var testKey1 = "zrangebyscoreKey1";
  var testKey2 = "zrangebyscoreKey2";
  var testKey3 = "zrangebyscoreKey3";
  var testKey4 = "zrangebyscoreKey4";
  var testKey5 = "zrangebyscoreKey5";
  var testKey6 = "zrangebyscoreKey6";
  var args = [
    1, 'm1',
    1.1, 'm1.1',
    1.2, 'm1.2',
    1.3, 'm1.3',
    1.4, 'm1.4',
    1.5, 'm1.5',
    2, 'm2',
    3, 'm3'
  ];

  var aLen = args.length;
  var mLen = aLen / 2;

  it("should return the inclusive min & max range withscores", function (done) {
    r.zadd([testKey1].concat(args), function(err, result) {
      result.should.equal(mLen);
      r.zrangebyscore([testKey1, '0', '5', 'withscores'], function(err, result) {
        should(result.length).equal(aLen);
        done();
      });
    });
  });

  it("should return the inclusive min and max range withscores", function (done) {
    r.zadd([testKey2].concat(args), function(err, result) {
      r.zrangebyscore([testKey2, '0', '(3', 'withscores'], function(err, result) {
        should(result.length).equal(7 * 2);
        done();
      });

    });
  });

 it("should return the min and inclusive max range withscores", function (done) {
    r.zadd([testKey3].concat(args), function(err, result) {
      r.zrangebyscore([testKey3, '(1.5', '3', 'withscores'], function(err, result) {
        should(result.length).equal(2 * 2);
        done();
      });
    });
  });

  it("should return the min and max range withscores", function (done) {
    r.zadd([testKey4].concat(args), function(err, result) {
      r.zrangebyscore([testKey4, '(1', '(2', 'withscores'], function(err, result) {
        should(result.length).equal(5 * 2);
        done();
      });
    });
  });

  it("should return the inclusive min & max range withscores", function (done) {
    r.zadd([testKey5].concat(args), function(err, result) {
      r.zrangebyscore([testKey5, '0', '5', 'withscores', 'limit', '1', '3'], function(err, result) {
        should(result.length).equal(6);
        done();
      });
    });
  });

  it("should return the inclusive -inf & +inf range withscores", function (done) {
    r.zadd([testKey6, '-1', 'm-1'].concat(args), function(err, result) {
      r.zrangebyscore([testKey6, '-inf', '+inf', 'withscores'], function(err, result) {
        should(result[0]).equal('m-1');
        should(result[1]).equal('-1');
        should(result.length).equal(aLen + 2);
        done();
      });
    });
  });

});

describe("zrank", function () {
  var testKey1 = "zrankKey1";
  var args = [
    1, 'm1',
    2, 'm2',
    3, 'm3',
    1.1, 'm1.1',
    1.2, 'm1.2',
    1.3, 'm1.3',
    1.4, 'm1.4',
    1.5, 'm1.5'
  ];
  it("should return the rank for a member", function (done) {
    r.zadd([testKey1].concat(args), function(err, result) {
      r.zrank(testKey1, 'm1.1', function(err, result) {
        result.should.equal(1);
        done();
      });
    });
  });
  it("should return a null rank for a missing member", function (done) {
    r.zrank(testKey1, 'm999', function(err, result) {
      should(result).equal(null);
      done();
    });
  });
});

describe("zrem", function () {
  var testKey1 = "zremKey1";
  var args = [
    1, 'm1',
    2, 'm2',
    3, 'm3',
    1.1, 'm1.1',
    1.2, 'm1.2',
    1.3, 'm1.3',
    1.4, 'm1.4',
    1.5, 'm1.5'
  ];
  it("should add and remove members", function (done) {
    r.zadd([testKey1].concat(args), function(err, result) {
        r.zrem([testKey1, 'm1', 'm2'], function(err, result) {
          result.should.equal(2);
          done();
      });
    });
  });
});


// ZREMRANGEBYRANK key start stop
// Remove all members in a sorted set within the given indexes
describe("zremrangebyrank", function () {
  var testKey1 = "zremrangebyrankKey1";
  var args = [
    1, 'm1',
    2, 'm2',
    3, 'm3',
    1.1, 'm1.1',
    1.2, 'm1.2',
    1.3, 'm1.3',
    1.4, 'm1.4',
    1.5, 'm1.5'
  ];
  it("should add and remove members by rank", function (done) {
    r.zadd([testKey1].concat(args), function(err, result) {
        r.zremrangebyrank([testKey1, '0', '1'], function(err, result) {
          result.should.equal(2);
          done();
      });
    });
  });
});

// ZREMRANGEBYSCORE key min max
// Remove all members in a sorted set within the given scores
describe("zremrangebyscore", function () {
  var testKey1 = "zremrangebyscoreKey1";
  var args = [
    1, 'm1',
    2, 'm2',
    3, 'm3',
    1.1, 'm1.1',
    1.2, 'm1.2',
    1.3, 'm1.3',
    1.4, 'm1.4',
    1.5, 'm1.5'
  ];
  it("should add and remove members by rank", function (done) {
    r.zadd([testKey1].concat(args), function(err, result) {
        r.zremrangebyscore([testKey1, '1.1', '1.5'], function(err, result) {
          result.should.equal(5);
          done();
      });
    });
  });
});

describe("zrevrange", function () {
  var testKey1 = "zrevrangeKey1";
  var testKey2 = "zrevrangeKey2";
  var testKey3 = "zrevrangeKey3";
  var testKey4 = "zrevrangeKey4";
  var testKey5 = "zrevrangeKey5";
  var args = [
    1, 'm1',
    2, 'm2',
    3, 'm3',
    1.1, 'm1.1',
    1.2, 'm1.2',
    1.3, 'm1.3',
    1.4, 'm1.4',
    1.5, 'm1.5',
    10, 'm10',
    10, 'm11'
  ];

  var aLen = args.length;
  var mLen = aLen / 2;

  it("should return everything withscores", function (done) {
    r.zadd([testKey1].concat(args), function(err, result) {
      result.should.equal(mLen);
      r.zrevrange([testKey1, '0', '-1', 'withscores'], function(err, result) {
        should(result[0]).equal('m11');
        should(result[1]).equal('10');
        should(result[2]).equal('m10');
        should(result[3]).equal('10');
        should(result.length).equal(aLen);
        done();
      });
    });
  });

  it("should return the inclusive start & stop withscores", function (done) {
    r.zadd([testKey2].concat(args), function(err, result) {
      result.should.equal(mLen);
      r.zrevrange([testKey2, '1', '5', 'withscores'], function(err, result) {
        should(result[0]).equal('m10');
        should(result[1]).equal('10');
        should(result[2]).equal('m3');
        should(result[3]).equal('3');
        should(result.length).equal(5 * 2);
        done();
      });
    });
  });

  it("should return everything without scores", function (done) {
    r.zadd([testKey3].concat(args), function(err, result) {
      r.zrevrange([testKey3, '0', '-1'], function(err, result) {
        should(result[0]).equal('m11');
        should(result[1]).equal('m10');
        should(result[2]).equal('m3');
        should(result.length).equal(mLen);
        done();
      });
    });
  });

  it("should return the inclusive start & stop without scores", function (done) {
    r.zadd([testKey4].concat(args), function(err, result) {
      result.should.equal(mLen);
      r.zrevrange([testKey4, '1', '5'], function(err, result) {
        should(result[0]).equal('m10');
        should(result[1]).equal('m3');
        should(result.length).equal(5);
        done();
      });
    });
  });

  it("should return last two members", function (done) {
    r.zadd([testKey5].concat(args), function(err, result) {
      r.zrevrange([testKey5, '-2', '-1'], function(err, result) {
        should(result[0]).equal('m1.1');
        should(result[1]).equal('m1');
        should(result.length).equal(2);
        done();
      });
    });
  });

});

describe("zrevrangebyscore", function () {
  var testKey1 = "zrevrangebyscoreKey1";
  var testKey2 = "zrevrangebyscoreKey2";
  var testKey3 = "zrevrangebyscoreKey3";
  var testKey4 = "zrevrangebyscoreKey4";
  var testKey5 = "zrevrangebyscoreKey5";
  var testKey6 = "zrevrangebyscoreKey6";

  var args = [
    1, 'm1',
    1.1, 'm1.1',
    1.2, 'm1.2',
    1.3, 'm1.3',
    1.4, 'm1.4',
    1.5, 'm1.5',
    2, 'm2',
    3, 'm3'
  ];

  var aLen = args.length;
  var mLen = aLen / 2;

  it("should return the inclusive min & max range withscores", function (done) {
    r.zadd([testKey1].concat(args), function(err, result) {
      result.should.equal(mLen);
      r.zrevrangebyscore([testKey1, '5', '0', 'withscores'], function(err, result) {
        should(result[0]).equal('m3');
        should(result[1]).equal('3');
        should(result.length).equal(aLen);
        done();
      });
    });
  });

  it("should return the inclusive min and max range withscores", function (done) {
    r.zadd([testKey2].concat(args), function(err, result) {
      r.zrevrangebyscore([testKey2, '(3', '0', 'withscores'], function(err, result) {
        should(result[0]).equal('m2');
        should(result[1]).equal('2');
        should(result.length).equal(7 * 2);
        done();
      });

    });
  });

 it("should return the min and inclusive max range withscores", function (done) {
    r.zadd([testKey3].concat(args), function(err, result) {
      r.zrevrangebyscore([testKey3, '3', '(1.5', 'withscores'], function(err, result) {
        should(result[0]).equal('m3');
        should(result[1]).equal('3');
        should(result.length).equal(2 * 2);
        done();
      });
    });
  });

  it("should return the min and max range withscores", function (done) {
    r.zadd([testKey4].concat(args), function(err, result) {
      r.zrevrangebyscore([testKey4, '(2', '(1', 'withscores'], function(err, result) {
        should(result[0]).equal('m1.5');
        should(result[1]).equal('1.5');
        should(result.length).equal(5 * 2);
        done();
      });
    });
  });

  it("should return the inclusive min & max range withscores", function (done) {
    r.zadd([testKey5].concat(args), function(err, result) {
      r.zrevrangebyscore([testKey5, '5', '0', 'withscores', 'limit', '1', '3'], function(err, result) {
        should(result.length).equal(6);
        done();
      });
    });
  });

  it("should return the inclusive -inf & +inf range withscores", function (done) {
    r.zadd([testKey6, '-1', 'm-1'].concat(args), function(err, result) {
      r.zrevrangebyscore([testKey6, '+inf', '-inf', 'withscores'], function(err, result) {
        should(result[0]).equal('m3');
        should(result[1]).equal('3');
        should(result[result.length-2]).equal('m-1');
        should(result[result.length-1]).equal('-1');
        should(result.length).equal(aLen + 2);
        done();
      });
    });
  });

});

describe("zrevrank", function () {
  var testKey1 = "zrevrankKey1";
  var args = [
    1, 'm1',
    2, 'm2',
    3, 'm3',
    1.1, 'm1.1',
    1.2, 'm1.2',
    1.3, 'm1.3',
    1.4, 'm1.4',
    1.5, 'm1.5'
  ];
  it("should return the rank for a member", function (done) {
    r.zadd([testKey1].concat(args), function(err, result) {
      r.zrevrank(testKey1, 'm2', function(err, result) {
        result.should.equal(1);
        done();
      });
    });
  });
  it("should return a null rank for a missing member", function (done) {
    r.zrevrank(testKey1, 'm999', function(err, result) {
      should(result).equal(null);
      done();
    });
  });
});

describe("zscore", function () {
  var nonExistentKey = '$#$#@#%%';
  var nonExistentMember = '@#@##$';
  var testKey1 = "zscoreKey1";
  var testScore1 = 100.00;
  var testMember1 = JSON.stringify({'a': 'b'});
  it("should add and return member score", function (done) {
    r.zadd(testKey1, testScore1, testMember1, function(err, result) {
      result.should.equal(1);

      r.zscore([testKey1, testMember1], function(err, result) {
        result.should.equal(String(100.00));
        done();
      });
    });
  });
  it("should return null on non existent key and/or member", function (done) {
    r.zscore([nonExistentKey, nonExistentKey], function(err, result) {
      should(result).be.null();

      r.zscore([testKey1, nonExistentKey], function(err, result) {
        should(result).be.null();
        done();
      });
    });
  });
});

describe("zunionstore", function () {
  it("performs set union across three existing sets", function (done) {
    r.zadd("zsrc1", 11, "mem:1:1", 21, "mem:1:2", 31, "mem:1:3", function(err, result) {
      r.zadd("zsrc2", 12, "mem:2:1", 22, "mem:2:2", function(err, result) {
        r.zadd("zsrc3", 13, "mem:3:1", 23, "mem:3:2", 33, "mem:3:3", function(err, result) {
          // Store the union of all three
          r.zunionstore("zdest1", 3, "zsrc1", "zsrc2", "zsrc3", function(error, result) {
            // Pull members and inspect
            result.should.equal(8)
            r.zrange(['zdest1', '0', '-1', 'withscores'], function(err, result) {
              result.should.deepEqual([
              'mem:1:1',
              '11',
              'mem:2:1',
              '12',
              'mem:3:1',
              '13',
              'mem:1:2',
              '21',
              'mem:2:2',
              '22',
              'mem:3:2',
              '23',
              'mem:1:3',
              '31',
              'mem:3:3',
              '33' ])
              done();
            });
          })
        });
      });
    });
  });

  it("supports non-existent sets", function (done) {
    r.zadd("zsrc1", 11, "mem:1:1", 21, "mem:1:2", 31, "mem:1:3", function(err, result) {
      r.zadd("zsrc2", 12, "mem:2:1", 22, "mem:2:2", function(err, result) {
        // Store the union of all three (but third one does not exist)
        r.zunionstore("zdest1", 3, "zsrc1", "zsrc2", "zsrc3", function(error, result) {
          // Pull members and inspect
          result.should.equal(5)
          r.zrange(['zdest1', '0', '-1', 'withscores'], function(err, result) {
            result.should.deepEqual([
            'mem:1:1',
            '11',
            'mem:2:1',
            '12',
            'mem:1:2',
            '21',
            'mem:2:2',
            '22',
            'mem:1:3',
            '31'])
            done();
          });
        })
      });
    });
  });

  it("use to copy a single set", function (done) {
    r.zadd("zsrc1", 11, "mem:1:1", 21, "mem:1:2", 31, "mem:1:3", function(err, result) {
      // Store the union of all three (but third one does not exist)
      r.zunionstore("zdest1", 1, "zsrc1", function(error, result) {
        // Pull members and inspect
        result.should.equal(3)
        r.zrange(['zdest1', '0', '-1', 'withscores'], function(err, result) {
          result.should.deepEqual([
          'mem:1:1',
          '11',
          'mem:1:2',
          '21',
          'mem:1:3',
          '31'])
          done();
        });
      })
    });
  });

  // TODO: Test that scores for values are aggregated with SUM by default
  // TODO: [WEIGHTS weight [weight ...]]
  // TODO: [AGGREGATE SUM|MIN|MAX]
});


describe("zinterstore", function () {
  it("performs set intersection between three existing sets", function (done) {
    r.zadd("zsrc1", 11, "cat", 21, "dog", 31, "parrot", function(err, result) {
      r.zadd("zsrc2", 12, "human", 22, "monkey", 10, "parrot", 1, "cat", function(err, result) {
        r.zadd("zsrc3", 13, "bird", 23, "parrot", 2, "cat", 33, "eagle", function(err, result) {
          // Store the intersection (should be: cat, parrot )
          r.zinterstore("zdest1", 3, "zsrc1", "zsrc2", "zsrc3", function(error, result) {
            // Pull members and inspect
            result.should.equal(2)
            r.zrange(['zdest1', '0', '-1', 'withscores'], function(err, result) {
              result.should.deepEqual([
              'cat',
              '14', // Sum: 11 + 1 + 2
              'parrot',
              '64' // Sum: 31 + 23 + 10
              ])
              done();
            });
          })
        });
      });
    });
  });

  it("supports non-existent sets", function (done) {
    r.zadd("zsrc1", 11, "mem:1:1", 21, "mem:1:2", 31, "mem:1:3", function(err, result) {
      r.zadd("zsrc2", 12, "mem:2:1", 22, "mem:2:2", function(err, result) {
        // Store the union of all three (but third one does not exist)
        r.zinterstore("zdest1", 3, "zsrc1", "zsrc2", "zsrc3", function(error, result) {
          // Pull members and inspect
          result.should.equal(0)
          r.zrange(['zdest1', '0', '-1', 'withscores'], function(err, result) {
            result.should.deepEqual([])
            done();
          });
        })
      });
    });
  });

  // TODO: [WEIGHTS weight [weight ...]]
  // TODO: [AGGREGATE SUM|MIN|MAX]
});

describe("sortedset multi commands", function () {
  var testKey1 = "sortedsetmultiKey1";

  it("should handle multi exec", function (done) {
    var multi = r.multi();
    // smoke test that some of these work
    multi.zadd([testKey1, '1', 'm1'], function(err, result) {
      result.should.equal(1);
    });
    multi.zscore([testKey1, 'm1'], function(err, result) {
      result.should.equal(String(1));
    });
    multi.exec(function(err, result) {
      done();
    });
  });
});
