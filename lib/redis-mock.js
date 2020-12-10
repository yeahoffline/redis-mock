/**
 * Module dependencies
 */
const events = require("events"),
  util = require("util"),
  parsers = require("./argParsers"),
  helpers = require("./helpers");

const noOpCallback = () => {}; // eslint-disable-line no-empty-function

const parsed = (parser, cb) => (...allArguments) => {
  const args = Array.from(allArguments);
  let userCallback = args[args.length - 1];
  let parsableArgs;
  if (typeof args[args.length - 1] === 'function') {
    userCallback = args[args.length - 1];
    parsableArgs = args.splice(0, args.length - 1);
  } else {
    userCallback = noOpCallback;
    parsableArgs = args;
  }
  try {
    const parsed = parser.parse(parsableArgs);

    return cb(parsed, userCallback);
  } catch (err) {
    return MockInstance._callCallback(userCallback, err);
  }
};

/**
 * @deprecated use {@link parsers} instead
 */
const parseArguments = function(args, options) { // eslint-disable-line complexity
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
           arr.push(String(args[1]));
        } else if(options && options.valueIsBuffer) {
           arr.push(args[1]);
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
};

/**
 * RedisMock constructor
 */
function RedisMock() {

  // Initialize an array of empty objects
  this.databases = new Array(helpers.getMaxDatabaseCount()).fill().
    map(function(_) { return {} });

  this.currentDatabase = 0;

  // Reference to the currently selected database
  this.storage = this.databases[this.currentDatabase];

  /**
   * Helper function to launch the callback(err, reply)
   * on the next process tick
   */
  this._callCallback = function (callback, err, result) {
    if (callback && typeof callback === 'function') {
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

  this.connected = false;
  this.ready = false;
  this.pub_sub_mode = false;


  // We always listen for 'message', even if this is not a subscription client.
  // We will only act on it, however, if the channel is in this.subscriptions, which is populated through subscribe
  this._message = function (ch, msg) {

    if (ch in self.subscriptions && self.subscriptions[ch] === true) {
      self.emit('message', ch, msg);
    }

    // Emit the message to ALL matching subscriptions
    Object.keys(self.psubscriptions).forEach(function(key) {
      if(self.psubscriptions[key].test(ch)) {
        self.emit('pmessage', key, ch, msg);
        return true;
      }
      return false;
    });
  };

  MockInstance.on('message', this._message);

  // Pub/sub subscriptions
  this.subscriptions = {};
  this.psubscriptions = {};


  process.nextTick(function () {
    self.connected = true;
    self.ready = true;
    self.emit("connect");
    self.emit("ready");
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
 * Duplicate
 */
RedisClient.prototype.duplicate = function (_options, callback) {
  if (typeof callback !== 'undefined') {
    return callback(null, new RedisClient());
  } else {
    return new RedisClient();
  }
};

/**
 * Quit
 */
RedisClient.prototype.quit = function (callback) {
  var self = this;

  // Remove all subscriptions (pub/sub)
  this.subscriptions = {};

  this.connected = false;
  this.ready = false;

  //Remove listener from MockInstance to avoid 'too many subscribers errors'
  MockInstance.removeListener('message', this._message);

  // TODO: Anything else we need to clear?

  process.nextTick(function () {
    self.emit("end");

    if (callback) {
      return callback();
    }
  });

};

/**
 * End
 */
var end = RedisClient.prototype.end = function () {
  return this.quit();
};

/**
 * Publish / subscribe / unsubscribe
 */
var pubsub = require("./pubsub.js");
RedisClient.prototype.subscribe = pubsub.subscribe;
RedisClient.prototype.psubscribe = pubsub.psubscribe;
RedisClient.prototype.unsubscribe = pubsub.unsubscribe;
RedisClient.prototype.punsubscribe = pubsub.punsubscribe;
RedisClient.prototype.publish = function (channel, msg, callback) {
  pubsub.publish.call(this, MockInstance, channel, msg);

  process.nextTick(function () {
    if (callback) {
      return callback();
    }
  });
};

/**
 * multi
 */
var multi = require("./multi");
RedisClient.prototype.multi = RedisClient.prototype.batch = function(commands) {
  return multi.multi(this, MockInstance, commands, false);
};
RedisClient.prototype.batch = function (commands) {
  return multi.multi(this, MockInstance, commands, true);
};

exports.Multi = multi.Multi;

/**
 * Keys function
 */

var keyfunctions = require("./keys.js");

var getKeysVarArgs = function (args) {
    var keys = [];
    var hasCallback = typeof(args[args.length - 1]) === 'function';
    for (var i = 0; i < (hasCallback ? args.length - 1 : args.length); i++) {
        keys.push(args[i]);
    }
    var callback = hasCallback ? args[args.length - 1] : undefined;
    return {keys: keys, callback: callback};
};

RedisClient.prototype.del = RedisClient.prototype.DEL = function (keys, callback) {

  keyfunctions.del.call(this, MockInstance, keys, callback);
};

RedisClient.prototype.exists = RedisClient.prototype.EXISTS = function (keys, callback) {
  var args = getKeysVarArgs(arguments);
  keys = args.keys;
  callback = args.callback;
  keyfunctions.exists.call(this, MockInstance, keys, callback);
};

RedisClient.prototype.type = RedisClient.prototype.TYPE = function(key, callback) {
  keyfunctions.type.call(this, MockInstance, key, callback);
};

RedisClient.prototype.expire = RedisClient.prototype.EXPIRE = function (key, seconds, callback) {

  keyfunctions.expire.call(this, MockInstance, key, seconds, callback);
};

RedisClient.prototype.pexpire = RedisClient.prototype.PEXPIRE = function (key, ms, callback) {

  keyfunctions.pexpire.call(this, MockInstance, key, ms, callback);
};

RedisClient.prototype.expireat = RedisClient.prototype.EXPIREAT = function (key, seconds, callback) {

  keyfunctions.expireat.call(this, MockInstance, key, seconds, callback);
};

RedisClient.prototype.pexpireat = RedisClient.prototype.PEXPIREAT = function (key, ms, callback) {

  keyfunctions.pexpireat.call(this, MockInstance, key, ms, callback);
};

RedisClient.prototype.persist = RedisClient.prototype.PERSIST = function (key, callback) {
  keyfunctions.persist.call(this, MockInstance, key, callback);
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

/**
 * SCAN cursor [MATCH pattern] [COUNT count] [TYPE type]
 */
RedisClient.prototype.scan = RedisClient.prototype.SCAN = parsed(parsers.scan, (args, cb) => {
  //TODO: add support for TYPE
  keyfunctions.scan.call(this, MockInstance, args.default.cursor, args.named.match, args.named.count, cb);
});

RedisClient.prototype.rename = RedisClient.prototype.RENAME = function (key, newKey, callback) {
  keyfunctions.rename.call(this, MockInstance, key, newKey, callback);
};

RedisClient.prototype.renamenx = RedisClient.prototype.RENAMENX = function (key, newKey, callback) {
  keyfunctions.renamenx.call(this, MockInstance, key, newKey, callback);
};

RedisClient.prototype.dbsize = RedisClient.prototype.DBSIZE = function (callback) {
  keyfunctions.dbsize.call(this, MockInstance, callback);
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

RedisClient.prototype.decr = RedisClient.prototype.DECR = function (key, callback) {

  stringfunctions.decr.call(this, MockInstance, key, callback);
};

RedisClient.prototype.decrby = RedisClient.prototype.DECRBY = function (key, value, callback) {

  stringfunctions.decrby.call(this, MockInstance, key, value, callback);
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

/**
 * SET key value [EX seconds|PX milliseconds|KEEPTTL] [NX|XX] [GET]
 *
 * Sets key value pair
 *
 * EX - expiration time in seconds
 * PX - expiration time in milliseconds
 * KEEPTTL - Retain the time to live associated with the key
 * NX - Only set the key if it does not already exist
 * XX - Only set the key if it already exist
 * GET - Return the old value stored at key, or nil when key did not exist
 */
RedisClient.prototype.set = RedisClient.prototype.SET = parsed(parsers.set, (args, cb) => {
  //TODO: introduce support for GET

  const getExpirationTime = () => {
    if (args.named.ex) {
      return args.named.ex;
    }
    if (args.named.px) {
      return args.named.px / 1000;
    }
    return undefined;
  };

  const keyExists = args.default.key in MockInstance.storage;
  const expirationTime = getExpirationTime();

  const postProcess = () => {
    if (expirationTime) {
      keyfunctions.expire.call(this, MockInstance, args.default.key, expirationTime, (err, result) => {
        MockInstance._callCallback(cb, err, "OK");
      });
    } else {
      MockInstance._callCallback(cb, null, "OK");
    }
  };

  if ((keyExists && args.named.xx) || (!keyExists && args.named.nx) || (!args.named.xx && !args.named.nx)) {
    // it it's okay to set the value
    stringfunctions.set.call(this, MockInstance, args.default.key, args.default.value, (err, result) => {
      if (err) {
        return MockInstance._callCallback(cb, err);
      }
      postProcess();
    });
  } else {
    // if it's not okay to set the value, but might still be okay to update the expiration timestamp, or GET the result
    postProcess();
  }
});

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

  hashing.hget.apply(this, [MockInstance].concat(parseArguments(arguments)));
};
RedisClient.prototype.hexists = RedisClient.prototype.HEXISTS = function (hash, key, callback) {

  hashing.hexists.apply(this, [MockInstance].concat(parseArguments(arguments)));
};
RedisClient.prototype.hdel = RedisClient.prototype.HDEL = function (hash, key, callback) {

  hashing.hdel.apply(this, [MockInstance].concat(parseArguments(arguments)));
};
RedisClient.prototype.hset = RedisClient.prototype.HSET = function (hash, key, value, callback) {

  hashing.hset.apply(this, [MockInstance].concat(parseArguments(arguments)));
};
RedisClient.prototype.hincrby = RedisClient.prototype.HINCRBY = function (hash, key, increment, callback) {

  hashing.hincrby.apply(this, [MockInstance].concat(parseArguments(arguments)));
};
RedisClient.prototype.hincrbyfloat = RedisClient.prototype.HINCRBYFLOAT = function (hash, key, increment, callback) {

  hashing.hincrbyfloat.apply(this, [MockInstance].concat(parseArguments(arguments)));
};

RedisClient.prototype.hsetnx = RedisClient.prototype.HSETNX = function (hash, key, value, callback) {

  hashing.hsetnx.apply(this, [MockInstance].concat(parseArguments(arguments)));
};
RedisClient.prototype.hlen = RedisClient.prototype.HLEN = function (hash, callback) {

  hashing.hlen.apply(this, [MockInstance].concat(parseArguments(arguments)));
};

RedisClient.prototype.hkeys = RedisClient.prototype.HKEYS = function (hash, callback) {

  hashing.hkeys.apply(this, [MockInstance].concat(parseArguments(arguments)));
};
RedisClient.prototype.hvals = RedisClient.prototype.HVALS = function (hash, callback) {

  hashing.hvals.apply(this, [MockInstance].concat(parseArguments(arguments)));
};
RedisClient.prototype.hmset = RedisClient.prototype.HMSET = function () {

  hashing.hmset.apply(this, [MockInstance].concat(parseArguments(arguments)));
};
RedisClient.prototype.hmget = RedisClient.prototype.HMGET = function () {

  hashing.hmget.apply(this, [MockInstance].concat(parseArguments(arguments)));
};
RedisClient.prototype.hgetall = RedisClient.prototype.HGETALL = function (hash, callback) {

  hashing.hgetall.apply(this, [MockInstance].concat(parseArguments(arguments)));
};

RedisClient.prototype.hscan = RedisClient.prototype.HSCAN = function () {
  var args = parseArguments(arguments);
  var hash = args[0];
  var index = args[1] || 0;
  var match = '*';
  var count = 10;

  if(args.length > 0) {
    for (var i = 0; i < args.length; i++) {
      if(typeof args[i] === 'string' &&  args[i].toLowerCase() === "match") {
        match = args[i+1];
      } else if(typeof args[i] === 'string' && args[i].toLowerCase() === "count") {
        count = args[i+1];
      }
    }
  }
  var callback = args.pop();
  hashing.hscan.call(this, MockInstance, hash, index, match, count, callback);
};


/**
 * List functions
 */
var listfunctions = require("./list.js");
RedisClient.prototype.llen = RedisClient.prototype.LLEN = function (key, callback) {
  listfunctions.llen.call(this, MockInstance, key, callback);
};

RedisClient.prototype.lpush = RedisClient.prototype.LPUSH = function () {
  var args = parseArguments(arguments);
  listfunctions.lpush.apply(this, [MockInstance].concat(args));
};

RedisClient.prototype.rpush = RedisClient.prototype.RPUSH = function () {
  var args = parseArguments(arguments);
  listfunctions.rpush.apply(this, [MockInstance].concat(args));
};

RedisClient.prototype.lpushx = RedisClient.prototype.LPUSHX = function (key, value, callback) {
  listfunctions.lpushx.call(this, MockInstance, key, value, callback);
};

RedisClient.prototype.rpushx = RedisClient.prototype.RPUSHX = function (key, value, callback) {
  listfunctions.rpushx.call(this, MockInstance, key, value, callback);
};

RedisClient.prototype.lpop = RedisClient.prototype.LPOP = function (key, callback) {
  listfunctions.lpop.call(this, MockInstance, key, callback);
};

RedisClient.prototype.rpop = RedisClient.prototype.RPOP = function (key, callback) {
  listfunctions.rpop.call(this, MockInstance, key, callback);
};

RedisClient.prototype.rpoplpush = RedisClient.prototype.RPOPLPUSH = function (sourceKey, destinationKey, callback) {
  listfunctions.rpoplpush.call(this, MockInstance, sourceKey, destinationKey, callback);
};

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
};

RedisClient.prototype.blpop = RedisClient.prototype.BLPOP = function (key, timeout, callback) {
  var args = [listfunctions.blpop];
  for (var i = 0; i < arguments.length; i++) {
    args.push(arguments[i]);
  }
  bpop.apply(this, args);
};

RedisClient.prototype.brpop = RedisClient.prototype.BRPOP = function (key, timeout, callback) {
  var args = [listfunctions.brpop];
  for (var i = 0; i < arguments.length; i++) {
    args.push(arguments[i]);
  }
  bpop.apply(this, args);
};

RedisClient.prototype.lindex = RedisClient.prototype.LINDEX = function (key, index, callback) {
  listfunctions.lindex.call(this, MockInstance, key, index, callback);
};

RedisClient.prototype.lrange = RedisClient.prototype.LRANGE = function (key, index1, index2, callback) {
  listfunctions.lrange.call(this, MockInstance, key, index1, index2, callback);
};

RedisClient.prototype.lrem = RedisClient.prototype.LREM = function (key, index, value, callback) {
  listfunctions.lrem.call(this, MockInstance, key, index, value, callback);
};

RedisClient.prototype.lset = RedisClient.prototype.LSET = function (key, index, value, callback) {
  listfunctions.lset.call(this, MockInstance, key, index, value, callback);
};

RedisClient.prototype.ltrim = RedisClient.prototype.LTRIM = function (key, start, end, callback) {
  listfunctions.ltrim.call(this, MockInstance, key, start, end, callback);
};

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
};

RedisClient.prototype.sadd = RedisClient.prototype.SADD = function () {
  setfunctions.sadd.apply(this, [MockInstance].concat(parseArguments(arguments)));
};

RedisClient.prototype.srem = RedisClient.prototype.SREM = function () {
  setfunctions.srem.apply(this, [MockInstance].concat(parseArguments(arguments)));
};

RedisClient.prototype.smembers = RedisClient.prototype.SMEMBERS = function (key, callback) {
  setfunctions.smembers.call(this, MockInstance, key, callback);
};

RedisClient.prototype.scard = RedisClient.prototype.SCARD = function (key, callback) {
  setfunctions.scard.call(this, MockInstance, key, callback);
};

RedisClient.prototype.sismember = RedisClient.prototype.SISMEMBER = function (key, member, callback) {
  setfunctions.sismember.call(this, MockInstance, key, member, callback);
};

RedisClient.prototype.smove = RedisClient.prototype.SMOVE = function (source, destination, member, callback) {
  setfunctions.smove.call(this, MockInstance, source, destination, member, callback);
};

RedisClient.prototype.srandmember = RedisClient.prototype.SRANDMEMBER = function (key, count, callback) {
  setfunctions.srandmember.call(this, MockInstance, key, count, callback);
};

RedisClient.prototype.sscan = RedisClient.prototype.SSCAN = parsed(parsers.sscan, (args, cb) => {
  setfunctions.sscan.call(this, MockInstance, args.default.key, args.default.cursor, args.named.match, args.named.count, cb);
});

/**
 * SortedSet functions

  *** NOT IMPLEMENTED ***
  ZLEXCOUNT key min max
  ZRANGEBYLEX key min max [LIMIT offset count]
  ZREVRANGEBYLEX key max min [LIMIT offset count]
  ZREMRANGEBYLEX key min max
  ZSCAN key cursor [MATCH pattern] [COUNT count]


  *** PARTIALLY IMPLEMENTED ***
  ZINTERSTORE - needs [WEIGHTS weight [weight ...]] [AGGREGATE SUM|MIN|MAX]
  ZUNIONSTORE - needs [WEIGHTS weight [weight ...]] [AGGREGATE SUM|MIN|MAX]
*/
var sortedset = require("./sortedset.js");

RedisClient.prototype.zadd = RedisClient.prototype.ZADD = function () {

  var args = parseArguments(arguments);
  sortedset.zadd.apply(this, [MockInstance].concat(args));
};

RedisClient.prototype.zcard = RedisClient.prototype.ZCARD = function () {

  var args = parseArguments(arguments);
  sortedset.zcard.apply(this, [MockInstance].concat(args));
};

RedisClient.prototype.zcount = RedisClient.prototype.ZCOUNT = function () {

  var args = parseArguments(arguments);
  sortedset.zcount.apply(this, [MockInstance].concat(args));
};

RedisClient.prototype.zincrby = RedisClient.prototype.ZINCRBY = function () {

  var args = parseArguments(arguments);
  sortedset.zincrby.apply(this, [MockInstance].concat(args));
};

RedisClient.prototype.zrange = RedisClient.prototype.ZRANGE = function () {

  var args = parseArguments(arguments);
  sortedset.zrange.apply(this, [MockInstance].concat(args));
};

RedisClient.prototype.zrangebyscore = RedisClient.prototype.ZRANGEBYSCORE = function () {

  var args = parseArguments(arguments);
  sortedset.zrangebyscore.apply(this, [MockInstance].concat(args));
};

RedisClient.prototype.zrank = RedisClient.prototype.ZRANK = function () {

  var args = parseArguments(arguments);
  sortedset.zrank.apply(this, [MockInstance].concat(args));
};

RedisClient.prototype.zrem = RedisClient.prototype.ZREM = function () {

  var args = parseArguments(arguments);
  sortedset.zrem.apply(this, [MockInstance].concat(args));
};

RedisClient.prototype.zremrangebyrank = RedisClient.prototype.ZREMRANGEBYRANK = function () {

  var args = parseArguments(arguments);
  sortedset.zremrangebyrank.apply(this, [MockInstance].concat(args));
};

RedisClient.prototype.zremrangebyscore = RedisClient.prototype.ZREMRANGEBYSCORE = function () {

  var args = parseArguments(arguments);
  sortedset.zremrangebyscore.apply(this, [MockInstance].concat(args));
};

RedisClient.prototype.zrevrange = RedisClient.prototype.ZREVRANGE = function () {

  var args = parseArguments(arguments);
  sortedset.zrevrange.apply(this, [MockInstance].concat(args));
};

RedisClient.prototype.zrevrangebyscore = RedisClient.prototype.ZREVRANGEBYSCORE = function () {

  var args = parseArguments(arguments);
  sortedset.zrevrangebyscore.apply(this, [MockInstance].concat(args));
};

RedisClient.prototype.zrevrank = RedisClient.prototype.ZREVRANK = function () {

  var args = parseArguments(arguments);
  sortedset.zrevrank.apply(this, [MockInstance].concat(args));
}

RedisClient.prototype.zunionstore = RedisClient.prototype.ZUNIONSTORE = function() {
  var args = parseArguments(arguments);
  sortedset.zunionstore.apply(this, [MockInstance].concat(args))
};

RedisClient.prototype.zinterstore = RedisClient.prototype.ZINTERSTORE = function() {
  var args = parseArguments(arguments);
  sortedset.zinterstore.apply(this, [MockInstance].concat(args))
};

RedisClient.prototype.zscore = RedisClient.prototype.ZSCORE = function () {

  var args = parseArguments(arguments);
  sortedset.zscore.apply(this, [MockInstance].concat(args));
};

/**
 * Other commands (Lua scripts)
 */

RedisClient.prototype.send_command = RedisClient.prototype.SEND_COMMAND = function (callback) {
  if (typeof(arguments[arguments.length - 1]) === 'function') {
    arguments[arguments.length - 1]();
  }
};

RedisClient.prototype.select = function (databaseIndex, callback) {
	var defaultMaxIndex = helpers.getMaxDatabaseCount() - 1;
  if (!isNaN(databaseIndex) && (databaseIndex <= defaultMaxIndex)) {
    serverfunctions.select.call(this, MockInstance, databaseIndex);
    return MockInstance._callCallback( callback, null, "OK");
  } else {
    var error = new Error('ERR invalid DB index');
    return MockInstance._callCallback( callback, error, null);
  }
};

/**
 * Server functions
 */
var serverfunctions = require("./server.js");
RedisClient.prototype.flushdb = RedisClient.prototype.FLUSHDB = function (callback) {

  serverfunctions.flushdb.call(this, MockInstance, callback);
};
RedisClient.prototype.flushall = RedisClient.prototype.FLUSHALL = function (callback) {

  serverfunctions.flushall.call(this, MockInstance, callback);
};

RedisClient.prototype.auth = RedisClient.prototype.AUTH = function (password, callback) {

  serverfunctions.auth.call(this, MockInstance, password, callback);
};

RedisMock.prototype.createClient = function (port_arg, host_arg, options) {

  return new RedisClient();
};
