
var Multi = function(client, MockInterface) {
  this._MockInterface = MockInterface
  this._client = client;
  this._commands = [];
  this._results = [];
  this._errors = [];
  this._discarded = false;
};

/**
 * Add a new command to the queue
 */
Multi.prototype._command = function(name, argList) {
  var self = this;
  var index = self._commands.length;

  var callBack;
  var args = argList;

  var lastArg = args[args.length -1];
  if(typeof lastArg === 'function') {
    callBack = lastArg;
    args = args.slice(0, args.length-1);
  }

  // Add a custom callback that chains the next commands,
  // or to terminate the queue.
  var command = args.concat(function (err, result) {
    if(callBack) {
      callBack(err, result);
    }

    self._errors[index] = err;
    self._results[index] = result;

    var nextIndex = index + 1;

    if (self._commands.length === nextIndex) {
      self._done();
    } else {
      var next = function() {
        self._commands[nextIndex]();
      }
      self._MockInterface._callCallback(next)
    }
  });

  self._commands.push(function () {
    self._client[name].apply(self, command)
  });
};

/**
 * called when all commands in the queue are finished
 */
Multi.prototype._done = function () {
  var callBack = this._doneCallback;
  if (callBack) {
    var errs = this._errors.filter(function (err) {
      return err !== null;
    });

    if (errs.length === 0) {
      errs = null;
    }

    callBack(errs, this._results);
  }
};

/**
 * starts running all commands in the queue
 */
Multi.prototype.exec = function (callback) {
  this._doneCallback = callback;
  if(this._discarded) {
    this._MockInterface._callCallback(callback, new Error("ERR EXEC without MULTI"));
  } else {
    if(this._commands.length == 0) {
      this._MockInterface._callCallback(callback, null, []);
    } else {
      this._commands[0]();
    }
  }
  return this;
};

/**
 * discards the queue
 */
Multi.prototype.discard = function (callback) {
  this._doneCallback = callback;
  this._commands.length = 0;
  this._discarded = true;
  return this;
};

/**
 * Make a command (higher order function)
 */
var makeCommands = function(names) {
  names.forEach(function (name) {
    Multi.prototype[name] = Multi.prototype[name.toUpperCase()] = function () {
      this._command(name, Array.prototype.slice.call(arguments));
      //Return this for chaining
      return this;
    };
  });
};

/**
 * Mirror of all redis commands
 */
makeCommands([
  'blpop',
  'brpop',
  'del',
  'exists',
  'expire',
  'get',
  'getset',
  'hdel',
  'hexists',
  'hget',
  'hgetall',
  'hincrby',
  'hincrbyfloat',
  'hkeys',
  'hlen',
  'hmget',
  'hmset',
  'hset',
  'hsetnx',
  'incr',
  'incrby',
  'incrbyfloat',
  'keys',
  'lindex',
  'llen',
  'lpop',
  'lpush',
  'lpushx',
  'lrange',
  'lset',
  'ltrim',
  'mget',
  'ping',
  'rpop',
  'rpush',
  'rpushx',
  'sadd',
  'sismember',
  'scard',
  'send_command',
  'set',
  'set',
  'setex',
  'setnx',
  'smembers',
  'smove',
  'srem',
  'ttl',
  'zadd',
  'zcard',
  'zcount',
  'zincrby',
  'zrange',
  'zrangebyscore',
  'zrank',
  'zrem',
  'zremrangebyrank',
  'zremrangebyscore',
  'zrevrange',
  'zrevrank',
  'zscore'
]);

var multi = function (client, MockInterface, commands) {
  var result = new Multi(client, MockInterface);
  if(commands) {
    commands.forEach(function (command) {
      result._command(command[0], command.slice(1));
    });
  }
  return result;
};

module.exports.multi = multi;
