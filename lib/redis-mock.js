/**
 * Module dependencies
 */
var events = require("events"),
  util = require("util");


var parseArguments = function(args, options) {
  var arr,
      len = args.length,
      callback,
      i = 0;
  if (Array.isArray(args[0])) {
    // arg0 = [hash, k1, v1, k2, v2,]
    // arg1 = callback
    arr = args[0];
    callback = args[1];
  } else if (Array.isArray(args[1])) {
    // arg0 = hash
    // arg1 = [k1, v1, k2, v2,]
    // arg2 = callback
    if (len === 3) {
      callback = args[2];
    }
    len = args[1].length;
    arr = new Array(len + 1);
    arr[0] = args[0];
    for (; i < len; i += 1) {
      arr[i + 1] = args[1][i];
    }
  } else if (typeof args[1] === 'object' &&
    (args.length === 2 || args.length === 3 &&
      (typeof args[2] === 'function' || typeof args[2] === 'undefined'))) {
        // arg0 = hash
        // arg1 = {k1: v1, k2: v2,}
        // arg2 = callback
        arr = [args[0]];
        if(options && options.valueIsString) {
           arr.push(args[1].toString());
        } else {
           for (var field in args[1]) {
               arr.push(field, args[1][field]);
           }
        }
        callback = args[2];
  } else {
    // arg0 = hash
    // arg1..N-1 = k1,v1,k2,v2,...N-1
    // argN = callback
    len = args.length;
    // The later should not be the average use case
    if (len !== 0 && (typeof args[len - 1] === 'function' || typeof args[len - 1] === 'undefined')) {
      len--;
      callback = args[len];
    }
    arr = new Array(len);
    for (; i < len; i += 1) {
      arr[i] = args[i];
    }
  }
  if (callback) {
    arr.push(callback);
  }

  return arr;
}

/**
 * RedisMock constructor
 */
function RedisMock() {

  this.storage = {};

  var self = this;

  /**
   * Helper function to launch the callback(err, reply)
   * on the next process tick
   */
  this._callCallback = function (callback, err, result) {
    if (callback) {
      process.nextTick(function () {
        callback(err, result);
      });
    }
  };
}

/**
 * RedisMock inherits from EventEmitter to be mock pub/sub
 */
util.inherits(RedisMock, events.EventEmitter);

/*
 * Create RedisMock instance and export
 */
var MockInstance = new RedisMock();
module.exports = exports = MockInstance;

/**
 * RedisClient constructor
 */
function RedisClient(stream, options) {

  var self = this;

  this.pub_sub_mode = false;


  // We always listen for 'message', even if this is not a subscription client.
  // We will only act on it, however, if the channel is in this.subscriptions, which is populated through subscribe
  this._message = function (ch, msg) {

    if (ch in self.subscriptions && self.subscriptions[ch] == true) {
      self.emit('message', ch, msg);
    }

    Object.keys(self.psubscriptions).some(function(key) {
      if(self.psubscriptions[key].test(ch)) {
        self.emit('pmessage', key, key, msg);
        return true;
      }
      return false;
    });
  }

  MockInstance.on('message', this._message);

  // Pub/sub subscriptions
  this.subscriptions = {};
  this.psubscriptions = {};

  process.nextTick(function () {

    self.emit("ready");
    self.emit("connect");

  });
}

/*
 * RedisClient inherits from EventEmitter
 */
util.inherits(RedisClient, events.EventEmitter);

/**
 * Export the RedisClient constructor
 */
RedisMock.prototype.RedisClient = RedisClient;

/**
 * End
 */
var end = RedisClient.prototype.end = function () {

  var self = this;

  // Remove all subscriptions (pub/sub)
  this.subscriptions = [];

  //Remove listener from MockInstance to avoid 'too many subscribers errors'
  MockInstance.removeListener('message', this._message);

  // TODO: Anything else we need to clear?

  process.nextTick(function () {

    self.emit("end");
  });

}

/**
 * Quit
 */
RedisClient.prototype.quit = end;

/**
 * Publish / subscribe / unsubscribe
 */
var pubsub = require("./pubsub.js");
RedisClient.prototype.subscribe = pubsub.subscribe;
RedisClient.prototype.psubscribe = pubsub.psubscribe;
RedisClient.prototype.unsubscribe = pubsub.unsubscribe;
RedisClient.prototype.punsubscribe = pubsub.punsubscribe;
RedisClient.prototype.publish = function (channel, msg) {
  pubsub.publish.call(this, MockInstance, channel, msg);
}

/**
 * multi
 */
var multi = require("./multi");
RedisClient.prototype.multi = function(commands) {
  return multi.multi(this, MockInstance, commands)
}
exports.Multi = multi.Multi;

/**
 * Keys function
 */

var keyfunctions = require("./keys.js");
RedisClient.prototype.del = RedisClient.prototype.DEL = function (keys, callback) {

  keyfunctions.del.call(this, MockInstance, keys, callback);
};

RedisClient.prototype.exists = RedisClient.prototype.EXISTS = function (key, callback) {

  keyfunctions.exists.call(this, MockInstance, key, callback);
};

RedisClient.prototype.expire = RedisClient.prototype.EXPIRE = function (key, seconds, callback) {

  keyfunctions.expire.call(this, MockInstance, key, seconds, callback);
};

RedisClient.prototype.ttl = RedisClient.prototype.TTL = function (key, callback) {

  keyfunctions.ttl.call(this, MockInstance, key, callback);
};

RedisClient.prototype.pttl = RedisClient.prototype.PTTL = function (key, callback) {
  keyfunctions.pttl.call(this, MockInstance, key, callback);
};

RedisClient.prototype.keys = RedisClient.prototype.KEYS = function (pattern, callback) {

  keyfunctions.keys.call(this, MockInstance, pattern, callback);
};

RedisClient.prototype.incr = RedisClient.prototype.INCR = function (key, callback) {

  stringfunctions.incr.call(this, MockInstance, key, callback);
};

RedisClient.prototype.incrby = RedisClient.prototype.INCRBY = function (key, value, callback) {

  stringfunctions.incrby.call(this, MockInstance, key, value, callback);
};

RedisClient.prototype.incrbyfloat = RedisClient.prototype.INCRBYFLOAT = function (key, value, callback) {

  stringfunctions.incrbyfloat.call(this, MockInstance, key, value, callback);
};

/**
 * String function
 */

var stringfunctions = require("./strings.js");
RedisClient.prototype.get = RedisClient.prototype.GET = function (key, callback) {

  stringfunctions.get.call(this, MockInstance, key, callback);
};

RedisClient.prototype.getset = RedisClient.prototype.GETSET = function (key, value, callback) {

  stringfunctions.getset.call(this, MockInstance, key, value, callback);
};

//SET key value [EX seconds] [PX milliseconds] [NX|XX]
RedisClient.prototype.set = RedisClient.prototype.SET = function (key, value, callback) {
    var args = parseArguments(arguments, {valueIsString: true});

    key = args.shift();
    value = args.shift();
    callback = args.pop();

    var isEx = false;
    var isPx = false;
    var isNx = false;
    var isXx = false;
    var expireTime = 0;
    var keyExists = false;
    if (key in MockInstance.storage) {
        keyExists = true;
    }

    if(args.length > 0) {
        for (var i = 0; i < args.length; i++) {
            if(typeof args[i] === 'string' &&  args[i].toLowerCase() === "ex") {
                isEx = true;
            } else if(typeof args[i] === 'string' && args[i].toLowerCase() === "px") {
                isPx = true;
            } else if(typeof args[i] === 'string' && args[i].toLowerCase() === "nx") {
                isNx = true;
            } else if(typeof args[i] === 'string' && args[i].toLowerCase() === "xx") {
                isXx = true;
            } else if(typeof args[i] === 'number' && args[i] % 1 === 0 ) {
                expireTime = args[i];
            }
        }
    }
    if(isPx === true) {
        expireTime = expireTime / 1000;
        isEx = true;
    }

    if(isEx === true) {
        if(isXx === true) {
            if(keyExists === true) {
                stringfunctions.set.call(this, MockInstance, key, value, function () {
                  keyfunctions.expire.call(this, MockInstance, key, expireTime, function(err, result) {
                      callback(err, "OK");
                  });
                });
            } else {
                MockInstance._callCallback(callback, null, 0);
            }
        } else if(isNx === true) {

            if(keyExists === true) {
                MockInstance._callCallback(callback, null, null);
            } else {
                stringfunctions.set.call(this, MockInstance, key, value, function () {
                  keyfunctions.expire.call(this, MockInstance, key, expireTime, function(err, result) {
                      callback(err, "OK");
                  });
                });
            }
        } else {
            stringfunctions.set.call(this, MockInstance, key, value, function () {
              keyfunctions.expire.call(this, MockInstance, key, expireTime, function(err, result) {
                  callback(err, "OK");
              });
            });
        }
    } else {

        if(isXx === true) {
            if(keyExists === true) {
                stringfunctions.set.call(this, MockInstance, key, value, callback);
            } else {
                MockInstance._callCallback(callback, null, null);
            }
        } else if(isNx === true) {
            if(keyExists === true) {
                MockInstance._callCallback(callback, null, 0);

            } else {
                stringfunctions.set.call(this, MockInstance, key, value, callback);
            }
        } else {
            stringfunctions.set.call(this, MockInstance, key, value, callback);
        }
    }

};

RedisClient.prototype.ping = RedisClient.prototype.PING = function (callback) {

  stringfunctions.ping.call(this, MockInstance, callback);
};

RedisClient.prototype.setex = RedisClient.prototype.SETEX = function (key, seconds, value, callback) {

  stringfunctions.set.call(this, MockInstance, key, value, function () {
    keyfunctions.expire.call(this, MockInstance, key, seconds, function(err, result) {
      MockInstance._callCallback(callback, err, "OK");
    });
  });
};

RedisClient.prototype.setnx = RedisClient.prototype.SETNX = function (key, value, callback) {
  stringfunctions.setnx.call(this, MockInstance, key, value, callback);
};

RedisClient.prototype.mget = RedisClient.prototype.MGET = function () {
  var newArguments = [MockInstance];
  for (var i = 0; i < arguments.length; i++) {
    newArguments.push(arguments[i]);
  }

  stringfunctions.mget.apply(this, newArguments);
};

RedisClient.prototype.mset = RedisClient.prototype.MSET = function () {
  var newArguments = [MockInstance, false];
  for (var i = 0; i < arguments.length; i++) {
    newArguments.push(arguments[i]);
  }

  stringfunctions.mset.apply(this, newArguments);
};

RedisClient.prototype.msetnx = RedisClient.prototype.MSETNX = function () {
  var newArguments = [MockInstance, true];
  for (var i = 0; i < arguments.length; i++) {
    newArguments.push(arguments[i]);
  }

  stringfunctions.mset.apply(this, newArguments);
};

/**
 * Hashing functions
 */
var hashing = require("./hash.js");
RedisClient.prototype.hget = RedisClient.prototype.HGET = function (hash, key, callback) {

  hashing.hget.call(this, MockInstance, hash, key, callback);
}
RedisClient.prototype.hexists = RedisClient.prototype.HEXISTS = function (hash, key, callback) {

  hashing.hexists.call(this, MockInstance, hash, key, callback);
}
RedisClient.prototype.hdel = RedisClient.prototype.HDEL = function (hash, key, callback) {

  hashing.hdel.call(this, MockInstance, hash, key, callback);
}
RedisClient.prototype.hset = RedisClient.prototype.HSET = function (hash, key, value, callback) {

  hashing.hset.call(this, MockInstance, hash, key, value, callback);
}
RedisClient.prototype.hincrby = RedisClient.prototype.HINCRBY = function (hash, key, increment, callback) {

  hashing.hincrby.call(this, MockInstance, hash, key, increment, callback);
}
RedisClient.prototype.hincrbyfloat = RedisClient.prototype.HINCRBYFLOAT = function (hash, key, increment, callback) {

  hashing.hincrbyfloat.call(this, MockInstance, hash, key, increment, callback);
}

RedisClient.prototype.hsetnx = RedisClient.prototype.HSETNX = function (hash, key, value, callback) {

  hashing.hsetnx.call(this, MockInstance, hash, key, value, callback);
}
RedisClient.prototype.hlen = RedisClient.prototype.HLEN = function (hash, callback) {

  hashing.hlen.call(this, MockInstance, hash, callback);
}

RedisClient.prototype.hkeys = RedisClient.prototype.HKEYS = function (hash, callback) {

  hashing.hkeys.call(this, MockInstance, hash, callback);
}
RedisClient.prototype.hvals = RedisClient.prototype.HVALS = function (hash, callback) {

  hashing.hvals.call(this, MockInstance, hash, callback);
}
RedisClient.prototype.hmset = RedisClient.prototype.HMSET = function () {

  var args = parseArguments(arguments);
  hashing.hmset.apply(this, [MockInstance].concat(args));
}
RedisClient.prototype.hmget = RedisClient.prototype.HMGET = function () {

  var newArguments = [MockInstance];
  for (var i = 0; i < arguments.length; i++) {
    newArguments.push(arguments[i]);
  }

  hashing.hmget.apply(this, newArguments);
}
RedisClient.prototype.hgetall = RedisClient.prototype.HGETALL = function (hash, callback) {

  hashing.hgetall.call(this, MockInstance, hash, callback);
}

/**
 * List functions
 */
var listfunctions = require("./list.js");
RedisClient.prototype.llen = RedisClient.prototype.LLEN = function (key, callback) {
  listfunctions.llen.call(this, MockInstance, key, callback);
}

RedisClient.prototype.lpush = RedisClient.prototype.LPUSH = function () {
  var args = parseArguments(arguments);
  listfunctions.lpush.apply(this, [MockInstance].concat(args));
}

RedisClient.prototype.rpush = RedisClient.prototype.RPUSH = function () {
  var args = parseArguments(arguments);
  listfunctions.rpush.apply(this, [MockInstance].concat(args));
}

RedisClient.prototype.lpushx = RedisClient.prototype.LPUSHX = function (key, value, callback) {
  listfunctions.lpushx.call(this, MockInstance, key, value, callback);
}

RedisClient.prototype.rpushx = RedisClient.prototype.RPUSHX = function (key, value, callback) {
  listfunctions.rpushx.call(this, MockInstance, key, value, callback);
}

RedisClient.prototype.lpop = RedisClient.prototype.LPOP = function (key, callback) {
  listfunctions.lpop.call(this, MockInstance, key, callback);
}

RedisClient.prototype.rpop = RedisClient.prototype.RPOP = function (key, callback) {
  listfunctions.rpop.call(this, MockInstance, key, callback);
}

var bpop = function (fn, key, timeout, callback) {
  var keys = [];
  var hasCallback = typeof(arguments[arguments.length - 1]) === "function";
  for (var i = 1; i < (hasCallback ? arguments.length - 2 : arguments.length - 1); i++) {
    keys.push(arguments[i]);
  }
  if (hasCallback) {
    fn.call(this, MockInstance, keys, arguments[arguments.length - 2], arguments[arguments.length - 1]);
  } else {
    fn.call(this, MockInstance, keys, arguments[arguments.length - 1]);
  }
}

RedisClient.prototype.blpop = RedisClient.prototype.BLPOP = function (key, timeout, callback) {
  var args = [listfunctions.blpop];
  for (var i = 0; i < arguments.length; i++) {
    args.push(arguments[i]);
  }
  bpop.apply(this, args);
}

RedisClient.prototype.brpop = RedisClient.prototype.BRPOP = function (key, timeout, callback) {
  var args = [listfunctions.brpop];
  for (var i = 0; i < arguments.length; i++) {
    args.push(arguments[i]);
  }
  bpop.apply(this, args);
}

RedisClient.prototype.lindex = RedisClient.prototype.LINDEX = function (key, index, callback) {
  listfunctions.lindex.call(this, MockInstance, key, index, callback);
}

RedisClient.prototype.lrange = RedisClient.prototype.LRANGE = function (key, index1, index2, callback) {
  listfunctions.lrange.call(this, MockInstance, key, index1, index2, callback);
}

RedisClient.prototype.lset = RedisClient.prototype.LSET = function (key, index, value, callback) {
  listfunctions.lset.call(this, MockInstance, key, index, value, callback);
}

RedisClient.prototype.ltrim = RedisClient.prototype.LTRIM = function (key, start, end, callback) {
  listfunctions.ltrim.call(this, MockInstance, key, start, end, callback);
}

/**
 * Set functions
 */
var setfunctions = require("./set.js");

var getVarargs = function (args) {
  var members = [];
  var hasCallback = typeof(args[args.length - 1]) === 'function';
  for (var i = 1; i < (hasCallback ? args.length - 1 : args.length); i++) {
    members.push(args[i]);
  }
  var callback = hasCallback ? args[args.length - 1] : undefined;
  return {members: members, callback: callback};
}

RedisClient.prototype.sadd = RedisClient.prototype.SADD = function (key, member, callback) {
  var args = getVarargs(arguments);
  setfunctions.sadd.call(this, MockInstance, key, args.members, args.callback);
}

RedisClient.prototype.srem = RedisClient.prototype.SREM = function (key, member, callback) {
  var args = getVarargs(arguments);
  setfunctions.srem.call(this, MockInstance, key, args.members, args.callback);
}

RedisClient.prototype.smembers = RedisClient.prototype.SMEMBERS = function (key, callback) {
  setfunctions.smembers.call(this, MockInstance, key, callback);
}

RedisClient.prototype.scard = RedisClient.prototype.SCARD = function (key, callback) {
  setfunctions.scard.call(this, MockInstance, key, callback);
}

RedisClient.prototype.sismember = RedisClient.prototype.SISMEMBER = function (key, member, callback) {
  setfunctions.sismember.call(this, MockInstance, key, member, callback);
}

RedisClient.prototype.smove = RedisClient.prototype.SMOVE = function (source, destination, member, callback) {
  setfunctions.smove.call(this, MockInstance, source, destination, member, callback);
}

RedisClient.prototype.srandmember = RedisClient.prototype.SRANDMEMBER = function (key, count, callback) {
  setfunctions.srandmember.call(this, MockInstance, key, count, callback);
}

/**
 * SortedSet functions

  *** NOT IMPLEMENTED ***
  ZINTERSTORE destination numkeys key [key ...] [WEIGHTS weight [weight ...]] [AGGREGATE SUM|MIN|MAX]
  ZLEXCOUNT key min max
  ZRANGEBYLEX key min max [LIMIT offset count]
  ZREVRANGEBYLEX key max min [LIMIT offset count]
  ZREMRANGEBYLEX key min max
  ZUNIONSTORE destination numkeys key [key ...] [WEIGHTS weight [weight ...]] [AGGREGATE SUM|MIN|MAX]
  ZSCAN key cursor [MATCH pattern] [COUNT count]
*/
var sortedset = require("./sortedset.js");

RedisClient.prototype.zadd = RedisClient.prototype.ZADD = function () {

  var args = parseArguments(arguments);
  sortedset.zadd.apply(this, [MockInstance].concat(args));
}

RedisClient.prototype.zcard = RedisClient.prototype.ZCARD = function () {

  var args = parseArguments(arguments);
  sortedset.zcard.apply(this, [MockInstance].concat(args));
}

RedisClient.prototype.zcount = RedisClient.prototype.ZCOUNT = function () {

  var args = parseArguments(arguments);
  sortedset.zcount.apply(this, [MockInstance].concat(args));
}

RedisClient.prototype.zincrby = RedisClient.prototype.ZINCRBY = function () {

  var args = parseArguments(arguments);
  sortedset.zincrby.apply(this, [MockInstance].concat(args));
}

RedisClient.prototype.zrange = RedisClient.prototype.ZRANGE = function () {

  var args = parseArguments(arguments);
  sortedset.zrange.apply(this, [MockInstance].concat(args));
}

RedisClient.prototype.zrangebyscore = RedisClient.prototype.ZRANGEBYSCORE = function () {

  var args = parseArguments(arguments);
  sortedset.zrangebyscore.apply(this, [MockInstance].concat(args));
}

RedisClient.prototype.zrank = RedisClient.prototype.ZRANK = function () {

  var args = parseArguments(arguments);
  sortedset.zrank.apply(this, [MockInstance].concat(args));
}

RedisClient.prototype.zrem = RedisClient.prototype.ZREM = function () {

  var args = parseArguments(arguments);
  sortedset.zrem.apply(this, [MockInstance].concat(args));
}

RedisClient.prototype.zremrangebyrank = RedisClient.prototype.ZREMRANGEBYRANK = function () {

  var args = parseArguments(arguments);
  sortedset.zremrangebyrank.apply(this, [MockInstance].concat(args));
}

RedisClient.prototype.zremrangebyscore = RedisClient.prototype.ZREMRANGEBYSCORE = function () {

  var args = parseArguments(arguments);
  sortedset.zremrangebyscore.apply(this, [MockInstance].concat(args));
}

RedisClient.prototype.zrevrange = RedisClient.prototype.ZREVRANGE = function () {

  var args = parseArguments(arguments);
  sortedset.zrevrange.apply(this, [MockInstance].concat(args));
}

RedisClient.prototype.zrevrangebyscore = RedisClient.prototype.ZREVRANGEBYSCORE = function () {

  var args = parseArguments(arguments);
  sortedset.zrevrangebyscore.apply(this, [MockInstance].concat(args));
}

RedisClient.prototype.zrevrank = RedisClient.prototype.ZREVRANK = function () {

  var args = parseArguments(arguments);
  sortedset.zrevrank.apply(this, [MockInstance].concat(args));
}

RedisClient.prototype.zscore = RedisClient.prototype.ZSCORE = function () {

  var args = parseArguments(arguments);
  sortedset.zscore.apply(this, [MockInstance].concat(args));
}

/**
 * Other commands (Lua scripts)
 */

RedisClient.prototype.send_command = RedisClient.prototype.SEND_COMMAND = function (callback) {
  if (typeof(arguments[arguments.length - 1]) == 'function') {
    arguments[arguments.length - 1]();
  }
}

RedisClient.prototype.select = function (database, callback) {
  if (!isNaN(database)) {
    return MockInstance._callCallback( callback, null, "OK");
  } else {
    var error = new Error('ERR invalid DB index');
    return MockInstance._callCallback( callback, error, null);
  }
}

/**
 * Server functions
 */
var serverfunctions = require("./server.js");
RedisClient.prototype.flushdb = RedisClient.prototype.FLUSHDB = function (callback) {

  serverfunctions.flushdb.call(this, MockInstance, callback);
}
RedisClient.prototype.flushall = RedisClient.prototype.FLUSHALL = function (callback) {

  serverfunctions.flushall.call(this, MockInstance, callback);
}

RedisClient.prototype.auth = RedisClient.prototype.AUTH = function (password, callback) {

  serverfunctions.auth.call(this, MockInstance, password, callback);
}

RedisMock.prototype.createClient = function (port_arg, host_arg, options) {

  return new RedisClient();
}
