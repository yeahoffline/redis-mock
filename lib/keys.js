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
exports.exists = function (mockInstance, key, callback) {

  var result = key in mockInstance.storage ? 1 : 0;

  mockInstance._callCallback(callback, null, result);
}

/**
 * Expire
 */
exports.expire = function (mockInstance, key, seconds, callback) {

  var result = 0;

  var obj = mockInstance.storage[key];

  if (obj) {
    var now = new Date().getTime();
    var milli = Math.min(seconds*1000, Math.pow(2, 31) - 1);

    if (mockInstance.storage[key]._expire) {
      clearTimeout(mockInstance.storage[key]._expire);
    }

    mockInstance.storage[key].expires = new Date(now + milli);
    mockInstance.storage[key]._expire = setTimeout(function() {
      delete mockInstance.storage[key];
    }, milli);

    result = 1;
  }

  mockInstance._callCallback(callback, null, result);
}

/**
 * TTL
 * http://redis.io/commands/ttl
 */
exports.ttl = function (mockInstance, key, callback) {
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
