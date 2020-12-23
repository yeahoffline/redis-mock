const helpers = require('../helpers');
const patternToRegex = require('../helpers').patternToRegex;

/**
 * Del
 */
exports.del = function (keys, callback) {

  if (!(keys instanceof Array)) {
    keys = [keys];
  }

  let keysDeleted = 0;

  for (let i = 0; i < keys.length; i++) {

    if (keys[i] in this.storage) {

      delete this.storage[keys[i]];
      keysDeleted++;

    }
  }

  helpers.callCallback(callback, null, keysDeleted);
};

/**
 * Exists
 */
exports.exists = function (keys, callback) {
  if (!(keys instanceof Array)) {
      keys = [keys];
  }

  let result = 0;
  for (let i = 0; i < keys.length; i++) {
      if( keys[i] in this.storage) {
        result++;
      }
  }

  helpers.callCallback(callback, null, result);
};

exports.type = function(key, callback) {
  const type = key in this.storage
    ? this.storage[key].type
    : "none";

  helpers.callCallback(callback, null, type);
};

/**
 * Expire
 */
exports.expire = function (key, seconds, callback) {
  let result = 0;

  const obj = this.storage[key];

  if (obj) {
    var now = new Date().getTime();
    var milli = Math.min(seconds*1000, Math.pow(2, 31) - 1);

    if (this.storage[key]._expire) {
      clearTimeout(this.storage[key]._expire);
    }

    this.storage[key].expires = new Date(now + milli);
    var _expire = setTimeout(() => {
        delete this.storage[key];
    }, milli);
    if (_expire.unref) {
      _expire.unref();
    }
    this.storage[key]._expire = _expire;

    result = 1;
  }

  helpers.callCallback(callback, null, result);
};

exports.pexpire = function (key, ms, callback) {
  const computedSeconds = ms > 0 ? ms/1000 : ms;
  return this.expire(key, computedSeconds, (err, seconds) => {
    helpers.callCallback(callback, err, seconds);
  });
};

/**
 * Expireat
 */
exports.expireat = function (key, timestamp, callback) {

  var result = 0;

  var obj = this.storage[key];

  if (obj) {
    var milli = timestamp * 1000;

    if (this.storage[key]._expire) {
      clearTimeout((...args) => this.storage[key]._expire(...args));
    }

    this.storage[key].expires = new Date(milli);
    var _expire = setTimeout(() => {
      delete this.storage[key];
    }, milli - Date.now());
    if (_expire.unref) {
      _expire.unref();
    }
    this.storage[key]._expire = _expire;

    result = 1;
  }

  helpers.callCallback(callback, null, result);
};

exports.pexpireat = function (key, timestamp, callback) {
   return this.expireat(key, timestamp / 1000, (err, result) => {
    helpers.callCallback(callback, err, result);
  });
};

/**
 * TTL
 * http://redis.io/commands/ttl
 */
exports.ttl = function (key, callback) {
  var result = 0;

  var obj = this.storage[key];

  if (obj) {
    var now = new Date().getTime();
    var expires = this.storage[key].expires instanceof Date ? this.storage[key].expires.getTime() : -1;
    var seconds = (expires - now) / 1000;

    if (seconds > 0) {
      result = seconds;
    } else {
      result = -1;
    }

  } else {
    result = -2;
  }

  helpers.callCallback(callback, null, result);
};

exports.pttl = function (key, callback) {
  return this.ttl(key, (err, ttl) => {
    const computedTtl = ttl > 0 ? ttl * 1000 : ttl;
    helpers.callCallback(callback, err, computedTtl);
  });
};


/**
 * PERSIST
 * http://redis.io/commands/persist
 */
exports.persist = function (key, callback) {
  var result = 0;

  var obj = this.storage[key];

  if (obj && obj.expires && obj.expires >= 0) {
    clearTimeout(obj._expire);
    delete obj.expires;
    result = 1;
  }

  helpers.callCallback(callback, null, result);
};

/**
 * Keys
 */
exports.keys = function (pattern, callback) {
  var regex = patternToRegex(pattern);
  var keys = [];

  for (var key in this.storage) {
    if (regex.test(key)) {
      keys.push(key);
    }
  }

  helpers.callCallback(callback, null, keys);
};

exports.scan = function (index, pattern, count, callback) {
  const regex = patternToRegex(pattern || '*');
  const keys = [];
  let idx = 1;
  let resIdx = 0;
  count = count || 10;

  for (const key in this.storage) {
    if (idx >= index && regex.test(key)) {
      keys.push(key);
      count--;
      if(count === 0) {
         resIdx = idx+1;
         break;
      }
    }
    idx++;
  }

  helpers.callCallback(callback, null, [resIdx.toString(), keys]);
};

/**
 * Rename
 * http://redis.io/commands/rename
 */
exports.rename = function (key, newKey, callback) {
  var err = null;

  if (key in this.storage) {
      this.storage[newKey] = this.storage[key];
      delete this.storage[key];
  } else {
      err = new Error("ERR no such key");
  }

  helpers.callCallback(callback, err, "OK");

};

/**
 * Renamenx
 * http://redis.io/commands/renamenx
 */
exports.renamenx = function (key, newKey, callback) {
  var err = null;
  var result;

  if (key in this.storage) {
    if (newKey in this.storage) {
      result = 0;
    } else {
      this.storage[newKey] = this.storage[key];
      delete this.storage[key];
      result = 1;
    }
  } else {
    err = new Error("ERR no such key");
  }

  helpers.callCallback(callback, err, result);
};

/**
 * Dbsize
 * http://redis.io/commands/dbsize
 */
exports.dbsize = function(callback) {
  var size = Object.keys(this.storage).length || 0;
  helpers.callCallback(callback, null, size);
};
