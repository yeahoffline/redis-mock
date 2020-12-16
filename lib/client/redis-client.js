const events = require("events"),
  parsers = require("./argParsers"),
  helpers = require("../helpers"),
  pubsub = require("./pubsub.js"),
  multi = require("./multi"),
  MockInstance = require('../server/redis-mock');

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

class RedisClient extends events.EventEmitter {

  constructor(stream, options) {
    super();
    this.connected = false;
    this.ready = false;
    this.pub_sub_mode = false;

    MockInstance.on('message', (ch, msg) => this._message(ch, msg));

    // Pub/sub subscriptions
    this.subscriptions = {};
    this.psubscriptions = {};

    process.nextTick(() => {
      this.connected = true;
      this.ready = true;
      this.emit("connect");
      this.emit("ready");
    });
  }

  /**
   * We always listen for 'message', even if this is not a subscription client.
   * We will only act on it, however, if the channel is in this.subscriptions, which is populated through subscribe
   * @private
   */
  _message(ch, msg) {
    if (ch in this.subscriptions && this.subscriptions[ch] === true) {
      this.emit('message', ch, msg);
    }

    // Emit the message to ALL matching subscriptions
    Object.keys(this.psubscriptions).forEach((key) => {
      if(this.psubscriptions[key].test(ch)) {
        this.emit('pmessage', key, ch, msg);
        return true;
      }
      return false;
    });
  }

  duplicate(_options, callback) {
    if (typeof callback !== 'undefined') {
      return callback(null, new RedisClient());
    } else {
      return new RedisClient();
    }
  }

  quit(callback) {
    // Remove all subscriptions (pub/sub)
    this.subscriptions = {};

    this.connected = false;
    this.ready = false;

    //Remove listener from MockInstance to avoid 'too many subscribers errors'
    MockInstance.removeListener('message', (ch, msg) => this._message(ch, msg));

    // TODO: Anything else we need to clear?

    process.nextTick(() => {
      this.emit("end");

      if (callback) {
        return callback();
      }
    });
  }

  end() {
    return this.quit();
  }
}

/**
 * Publish / subscribe / unsubscribe
 */
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
RedisClient.prototype.multi = RedisClient.prototype.batch = function(commands) {
  return multi.multi(this, MockInstance, commands, false);
};
RedisClient.prototype.batch = function (commands) {
  return multi.multi(this, MockInstance, commands, true);
};

/**
 * Keys function
 */

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
  MockInstance.del(keys, callback);
};

RedisClient.prototype.exists = RedisClient.prototype.EXISTS = function (keys, callback) {
  const args = getKeysVarArgs(arguments);
  keys = args.keys;
  callback = args.callback;
  MockInstance.exists(keys, callback);
};

RedisClient.prototype.type = RedisClient.prototype.TYPE = function(key, callback) {
  MockInstance.type(key, callback);
};

RedisClient.prototype.expire = RedisClient.prototype.EXPIRE = function (key, seconds, callback) {
  MockInstance.expire(key, seconds, callback);
};

RedisClient.prototype.pexpire = RedisClient.prototype.PEXPIRE = function (key, ms, callback) {
  MockInstance.pexpire(key, ms, callback);
};

RedisClient.prototype.expireat = RedisClient.prototype.EXPIREAT = function (key, seconds, callback) {
  MockInstance.expireat(key, seconds, callback);
};

RedisClient.prototype.pexpireat = RedisClient.prototype.PEXPIREAT = function (key, ms, callback) {
  MockInstance.pexpireat(key, ms, callback);
};

RedisClient.prototype.persist = RedisClient.prototype.PERSIST = function (key, callback) {
  MockInstance.persist(key, callback);
};

RedisClient.prototype.ttl = RedisClient.prototype.TTL = function (key, callback) {
  MockInstance.ttl(key, callback);
};

RedisClient.prototype.pttl = RedisClient.prototype.PTTL = function (key, callback) {
  MockInstance.pttl(key, callback);
};

RedisClient.prototype.keys = RedisClient.prototype.KEYS = function (pattern, callback) {
  MockInstance.keys(pattern, callback);
};

/**
 * SCAN cursor [MATCH pattern] [COUNT count] [TYPE type]
 */
RedisClient.prototype.scan = RedisClient.prototype.SCAN = parsed(parsers.scan, (args, cb) => {
  //TODO: add support for TYPE
  MockInstance.scan(args.default.cursor, args.named.match, args.named.count, cb);
});

RedisClient.prototype.rename = RedisClient.prototype.RENAME = function (key, newKey, callback) {
  MockInstance.rename(key, newKey, callback);
};

RedisClient.prototype.renamenx = RedisClient.prototype.RENAMENX = function (key, newKey, callback) {
  MockInstance.renamenx(key, newKey, callback);
};

RedisClient.prototype.dbsize = RedisClient.prototype.DBSIZE = function (callback) {
  MockInstance.dbsize(callback);
};

RedisClient.prototype.incr = RedisClient.prototype.INCR = function (key, callback) {
  MockInstance.incr(key, callback);
};

RedisClient.prototype.incrby = RedisClient.prototype.INCRBY = function (key, value, callback) {
  MockInstance.incrby(key, value, callback);
};

RedisClient.prototype.incrbyfloat = RedisClient.prototype.INCRBYFLOAT = function (key, value, callback) {
  MockInstance.incrbyfloat(key, value, callback);
};

RedisClient.prototype.decr = RedisClient.prototype.DECR = function (key, callback) {
  MockInstance.decr(key, callback);
};

RedisClient.prototype.decrby = RedisClient.prototype.DECRBY = function (key, value, callback) {
  MockInstance.decrby(key, value, callback);
};

RedisClient.prototype.get = RedisClient.prototype.GET = function (key, callback) {
  MockInstance.get(key, callback);
};

RedisClient.prototype.getset = RedisClient.prototype.GETSET = function (key, value, callback) {
  MockInstance.getset(key, value, callback);
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
      MockInstance.expire(args.default.key, expirationTime, (err, result) => {
        MockInstance._callCallback(cb, err, "OK");
      });
    } else {
      MockInstance._callCallback(cb, null, "OK");
    }
  };

  if ((keyExists && args.named.xx) || (!keyExists && args.named.nx) || (!args.named.xx && !args.named.nx)) {
    // it it's okay to set the value
    MockInstance.set(args.default.key, args.default.value, (err, result) => {
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
  MockInstance.ping(callback);
};

RedisClient.prototype.setex = RedisClient.prototype.SETEX = function (key, seconds, value, callback) {
  const self = this;
  MockInstance.set(key, value, () => {
    MockInstance.expire(key, seconds, function(err, result) {
      MockInstance._callCallback(callback, err, "OK");
    });
  });
};

RedisClient.prototype.setnx = RedisClient.prototype.SETNX = function (key, value, callback) {
  MockInstance.setnx(key, value, callback);
};

RedisClient.prototype.mget = RedisClient.prototype.MGET = function (...args) {
  MockInstance.mget(...args);
};

RedisClient.prototype.mset = RedisClient.prototype.MSET = function (...args) {
  MockInstance.mset(false, ...args);
};

RedisClient.prototype.msetnx = RedisClient.prototype.MSETNX = function (...args) {
  MockInstance.mset(true, ...args);
};

RedisClient.prototype.hget = RedisClient.prototype.HGET = function (hash, key, callback) {
  MockInstance.hget(...parseArguments(arguments));
};

RedisClient.prototype.hexists = RedisClient.prototype.HEXISTS = function (hash, key, callback) {
  MockInstance.hexists(...parseArguments(arguments));
};

RedisClient.prototype.hdel = RedisClient.prototype.HDEL = function (hash, key, callback) {
  MockInstance.hdel(...parseArguments(arguments));
};

RedisClient.prototype.hset = RedisClient.prototype.HSET = function (hash, key, value, callback) {
  MockInstance.hset(...parseArguments(arguments));
};

RedisClient.prototype.hincrby = RedisClient.prototype.HINCRBY = function (hash, key, increment, callback) {
  MockInstance.hincrby(...parseArguments(arguments));
};

RedisClient.prototype.hincrbyfloat = RedisClient.prototype.HINCRBYFLOAT = function (hash, key, increment, callback) {
  MockInstance.hincrbyfloat(...parseArguments(arguments));
};

RedisClient.prototype.hsetnx = RedisClient.prototype.HSETNX = function (hash, key, value, callback) {
  MockInstance.hsetnx(...parseArguments(arguments));
};

RedisClient.prototype.hlen = RedisClient.prototype.HLEN = function (hash, callback) {
  MockInstance.hlen(...parseArguments(arguments));
};

RedisClient.prototype.hkeys = RedisClient.prototype.HKEYS = function (hash, callback) {
  MockInstance.hkeys(...parseArguments(arguments));
};

RedisClient.prototype.hvals = RedisClient.prototype.HVALS = function (hash, callback) {
  MockInstance.hvals(...parseArguments(arguments));
};

RedisClient.prototype.hmset = RedisClient.prototype.HMSET = function () {
  MockInstance.hmset(...parseArguments(arguments));
};

RedisClient.prototype.hmget = RedisClient.prototype.HMGET = function () {
  MockInstance.hmget(...parseArguments(arguments));
};

RedisClient.prototype.hgetall = RedisClient.prototype.HGETALL = function (hash, callback) {
  MockInstance.hgetall(...parseArguments(arguments));
};

RedisClient.prototype.hscan = RedisClient.prototype.HSCAN = function () {
  const args = parseArguments(arguments);
  const hash = args[0];
  const index = args[1] || 0;
  let match = '*';
  let count = 10;

  if(args.length > 0) {
    for (let i = 0; i < args.length; i++) {
      if(typeof args[i] === 'string' &&  args[i].toLowerCase() === "match") {
        match = args[i+1];
      } else if(typeof args[i] === 'string' && args[i].toLowerCase() === "count") {
        count = args[i+1];
      }
    }
  }
  const callback = args.pop();
  MockInstance.hscan(hash, index, match, count, callback);
};


/**
 * List functions
 */
RedisClient.prototype.llen = RedisClient.prototype.LLEN = function (key, callback) {
  MockInstance.llen(key, callback);
};

RedisClient.prototype.lpush = RedisClient.prototype.LPUSH = function () {
  const args = parseArguments(arguments);
  MockInstance.lpush(...args);
};

RedisClient.prototype.rpush = RedisClient.prototype.RPUSH = function () {
  const args = parseArguments(arguments);
  MockInstance.rpush(...args);
};

RedisClient.prototype.lpushx = RedisClient.prototype.LPUSHX = function (key, value, callback) {
  MockInstance.lpushx(key, value, callback);
};

RedisClient.prototype.rpushx = RedisClient.prototype.RPUSHX = function (key, value, callback) {
  MockInstance.rpushx(key, value, callback);
};

RedisClient.prototype.lpop = RedisClient.prototype.LPOP = function (key, callback) {
  MockInstance.lpop(key, callback);
};

RedisClient.prototype.rpop = RedisClient.prototype.RPOP = function (key, callback) {
  MockInstance.rpop(key, callback);
};

RedisClient.prototype.rpoplpush = RedisClient.prototype.RPOPLPUSH = function (sourceKey, destinationKey, callback) {
  MockInstance.rpoplpush(sourceKey, destinationKey, callback);
};

RedisClient.prototype._bpop = function (fn, key, timeout, callback) {
  const keys = [];
  const hasCallback = typeof(arguments[arguments.length - 1]) === "function";
  for (let i = 1; i < (hasCallback ? arguments.length - 2 : arguments.length - 1); i++) {
    keys.push(arguments[i]);
  }
  if (hasCallback) {
    fn(keys, arguments[arguments.length - 2], arguments[arguments.length - 1]);
  } else {
    fn(keys, arguments[arguments.length - 1]);
  }
};

RedisClient.prototype.blpop = RedisClient.prototype.BLPOP = function (key, timeout, callback) {
  this._bpop((...args) => MockInstance.blpop(...args), ...arguments);
};

RedisClient.prototype.brpop = RedisClient.prototype.BRPOP = function (key, timeout, callback) {
  this._bpop((...args) => MockInstance.brpop(...args), ...arguments);
};

RedisClient.prototype.lindex = RedisClient.prototype.LINDEX = function (key, index, callback) {
  MockInstance.lindex(key, index, callback);
};

RedisClient.prototype.lrange = RedisClient.prototype.LRANGE = function (key, index1, index2, callback) {
  MockInstance.lrange(key, index1, index2, callback);
};

RedisClient.prototype.lrem = RedisClient.prototype.LREM = function (key, index, value, callback) {
  MockInstance.lrem(key, index, value, callback);
};

RedisClient.prototype.lset = RedisClient.prototype.LSET = function (key, index, value, callback) {
  MockInstance.lset(key, index, value, callback);
};

RedisClient.prototype.ltrim = RedisClient.prototype.LTRIM = function (key, start, end, callback) {
  MockInstance.ltrim(key, start, end, callback);
};

RedisClient.prototype.sadd = RedisClient.prototype.SADD = function () {
  MockInstance.sadd(...parseArguments(arguments));
};

RedisClient.prototype.srem = RedisClient.prototype.SREM = function () {
  MockInstance.srem(...parseArguments(arguments));
};

RedisClient.prototype.smembers = RedisClient.prototype.SMEMBERS = function (key, callback) {
  MockInstance.smembers(key, callback);
};

RedisClient.prototype.scard = RedisClient.prototype.SCARD = function (key, callback) {
  MockInstance.scard(key, callback);
};

RedisClient.prototype.sismember = RedisClient.prototype.SISMEMBER = function (key, member, callback) {
  MockInstance.sismember(key, member, callback);
};

RedisClient.prototype.smove = RedisClient.prototype.SMOVE = function (source, destination, member, callback) {
  MockInstance.smove(source, destination, member, callback);
};

RedisClient.prototype.srandmember = RedisClient.prototype.SRANDMEMBER = function (key, count, callback) {
  MockInstance.srandmember(key, count, callback);
};

RedisClient.prototype.sscan = RedisClient.prototype.SSCAN = parsed(parsers.sscan, (args, cb) => {
  MockInstance.sscan(args.default.key, args.default.cursor, args.named.match, args.named.count, cb);
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

RedisClient.prototype.zadd = RedisClient.prototype.ZADD = function () {
  const args = parseArguments(arguments);
  MockInstance.zadd(...args);
};

RedisClient.prototype.zcard = RedisClient.prototype.ZCARD = function () {
  const args = parseArguments(arguments);
  MockInstance.zcard(...args);
};

RedisClient.prototype.zcount = RedisClient.prototype.ZCOUNT = function () {
  const args = parseArguments(arguments);
  MockInstance.zcount(...args);
};

RedisClient.prototype.zincrby = RedisClient.prototype.ZINCRBY = function () {
  const args = parseArguments(arguments);
  MockInstance.zincrby(...args);
};

RedisClient.prototype.zrange = RedisClient.prototype.ZRANGE = function () {
  const args = parseArguments(arguments);
  MockInstance.zrange(...args);
};

RedisClient.prototype.zrangebyscore = RedisClient.prototype.ZRANGEBYSCORE = function () {
  const args = parseArguments(arguments);
  MockInstance.zrangebyscore(...args);
};

RedisClient.prototype.zrank = RedisClient.prototype.ZRANK = function () {
  const args = parseArguments(arguments);
  MockInstance.zrank(...args);
};

RedisClient.prototype.zrem = RedisClient.prototype.ZREM = function () {
  const args = parseArguments(arguments);
  MockInstance.zrem(...args);
};

RedisClient.prototype.zremrangebyrank = RedisClient.prototype.ZREMRANGEBYRANK = function () {
  const args = parseArguments(arguments);
  MockInstance.zremrangebyrank(...args);
};

RedisClient.prototype.zremrangebyscore = RedisClient.prototype.ZREMRANGEBYSCORE = function () {
  const args = parseArguments(arguments);
  MockInstance.zremrangebyscore(...args);
};

RedisClient.prototype.zrevrange = RedisClient.prototype.ZREVRANGE = function () {
  const args = parseArguments(arguments);
  MockInstance.zrevrange(...args);
};

RedisClient.prototype.zrevrangebyscore = RedisClient.prototype.ZREVRANGEBYSCORE = function () {
  const args = parseArguments(arguments);
  MockInstance.zrevrangebyscore(...args);
};

RedisClient.prototype.zrevrank = RedisClient.prototype.ZREVRANK = function () {
  const args = parseArguments(arguments);
  MockInstance.zrevrank(...args);
}

RedisClient.prototype.zunionstore = RedisClient.prototype.ZUNIONSTORE = function() {
  const args = parseArguments(arguments);
  MockInstance.zunionstore(...args);
};

RedisClient.prototype.zinterstore = RedisClient.prototype.ZINTERSTORE = function() {
  const args = parseArguments(arguments);
  MockInstance.zinterstore(...args);
};

RedisClient.prototype.zscore = RedisClient.prototype.ZSCORE = function () {
  const args = parseArguments(arguments);
  MockInstance.zscore(...args);
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
    MockInstance.select(databaseIndex);
    return MockInstance._callCallback( callback, null, "OK");
  } else {
    var error = new Error('ERR invalid DB index');
    return MockInstance._callCallback( callback, error, null);
  }
};

RedisClient.prototype.flushdb = RedisClient.prototype.FLUSHDB = function (callback) {
  MockInstance.flushdb(callback);
};

RedisClient.prototype.flushall = RedisClient.prototype.FLUSHALL = function (callback) {
  MockInstance.flushall(callback);
};

RedisClient.prototype.auth = RedisClient.prototype.AUTH = function (password, callback) {
  MockInstance.auth(password, callback);
};

module.exports = RedisClient;
