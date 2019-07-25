var patternToRegex = require('./helpers').patternToRegex;

/**
 * Del
 */
exports.del = function (mockInstance, keys, callback) {

  if (!(keys instanceof Array)) {
    keys = [keys];
  }

  var keysDeleted = 0;

  for (var i = 0; i < keys.length; i++) {

    if (keys[i] in mockInstance.storage) {

      delete mockInstance.storage[keys[i]];
      keysDeleted++;

    }
  }

  mockInstance._callCallback(callback, null, keysDeleted);
}

/**
 * Exists
 */
exports.exists = function (mockInstance, keys, callback) {
  if (!(keys instanceof Array)) {
      keys = [keys];
  }

  var result = 0
  for (var i = 0; i < keys.length; i++) {
      if( keys[i] in mockInstance.storage) {
        result++
      }
  }

  mockInstance._callCallback(callback, null, result);
}

exports.type = function(mockInstance, key, callback) {
  var type = "none";

  if (key in mockInstance.storage) {
    type = mockInstance.storage[key].type;
  }

  mockInstance._callCallback(callback, null, type);
};

/**
 * Expire
 */
 var expire = function (mockInstance, key, seconds, callback) {

  var result = 0;

  var obj = mockInstance.storage[key];

  if (obj) {
    var now = new Date().getTime();
    var milli = Math.min(seconds*1000, Math.pow(2, 31) - 1);

    if (mockInstance.storage[key]._expire) {
      clearTimeout(mockInstance.storage[key]._expire);
    }

    mockInstance.storage[key].expires = new Date(now + milli);
    var _expire = setTimeout(function() {
        delete mockInstance.storage[key];
    }, milli);
    if (_expire.unref) {
      _expire.unref();
    }
    mockInstance.storage[key]._expire = _expire;

    result = 1;
  }

  mockInstance._callCallback(callback, null, result);
}

exports.expire = expire;

exports.pexpire = function (mockInstance, key, ms, callback) {
  var computedSeconds = ms > 0 ? ms/1000 : ms;
  return expire(mockInstance, key, computedSeconds, function(err, seconds) {
    mockInstance._callCallback(callback, err, seconds);
  });
};

/**
 * TTL
 * http://redis.io/commands/ttl
 */
var ttl = function (mockInstance, key, callback) {
  var result = 0;

  var obj = mockInstance.storage[key];

  if (obj) {
    var now = new Date().getTime();
    var expires = mockInstance.storage[key].expires instanceof Date ? mockInstance.storage[key].expires.getTime() : -1;
    var seconds = (expires - now) / 1000;

    if (seconds > 0) {
      result = seconds;
    } else {
      result = -1;
    }

  } else {
    result = -2;
  }

  mockInstance._callCallback(callback, null, result);
};

exports.ttl = ttl;

exports.pttl = function (mockInstance, key, callback) {
  return ttl(mockInstance, key, function(err, ttl) {
    var computedTtl = ttl > 0 ? ttl * 1000 : ttl;
    mockInstance._callCallback(callback, err, computedTtl);
  });
};


/**
 * PERSIST
 * http://redis.io/commands/persist
 */
exports.persist = function (mockInstance, key, callback) {
  var result = 0;

  var obj = mockInstance.storage[key];

  if (obj && obj.expires && obj.expires >= 0) {
    clearTimeout(obj._expire);
    delete obj.expires
    result = 1;
  }

  mockInstance._callCallback(callback, null, result);
};

/**
 * Keys
 */
exports.keys = function (mockInstance, pattern, callback) {
  var regex = patternToRegex(pattern);
  var keys = [];

  for (var key in mockInstance.storage) {
    if (regex.test(key)) {
      keys.push(key);
    }
  }

  mockInstance._callCallback(callback, null, keys);
}

exports.scan = function (mockInstance, index, pattern, count, callback) {
  var regex = patternToRegex(pattern);
  var keys = [];
  var idx = 1;
  var resIdx = 0;
  count = count || 10;

  for (var key in mockInstance.storage) {
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

  mockInstance._callCallback(callback, null, [resIdx.toString(), keys]);
}

/**
 * Rename
 * http://redis.io/commands/rename
 */
exports.rename = function (mockInstance, key, newKey, callback) {
  var err = null

  if (key in mockInstance.storage) {
      mockInstance.storage[newKey] = mockInstance.storage[key]
      delete mockInstance.storage[key];
  } else {
      err = new Error("ERR no such key")
  }

  mockInstance._callCallback(callback, err, "OK");

}

/**
 * Renamenx
 * http://redis.io/commands/renamenx
 */
exports.renamenx = function (mockInstance, key, newKey, callback) {
  var err = null;
  var result;

  if (key in mockInstance.storage) {
    if (newKey in mockInstance.storage) {
      result = 0;
    } else {
      mockInstance.storage[newKey] = mockInstance.storage[key];
      delete mockInstance.storage[key];
      result = 1;
    }
  } else {
    err = new Error("ERR no such key");
  }

  mockInstance._callCallback(callback, err, result);
}

/**
 * Dbsize
 * http://redis.io/commands/dbsize
 */
exports.dbsize = function(mockInstance, callback) {
  var size = Object.keys(mockInstance.storage).length || 0
  mockInstance._callCallback(callback, null, size)
}
