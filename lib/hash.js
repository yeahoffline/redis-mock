/**
 * Module dependencies
 */
var Item = require("./item.js");
var patternToRegex = require('./helpers').patternToRegex;

/**
 * Hget
 */
exports.hget = function (mockInstance, hash, key, callback) {

  var value = null;
  var err = null;

  if (mockInstance.storage[hash]) {
    if (mockInstance.storage[hash].type === "hash") {
      value = mockInstance.storage[hash].value[key];
    } else {
      err = new Error("ERR Operation against a key holding the wrong kind of value");
    }
  }

  mockInstance._callCallback(callback, err, value);
}

/**
 * Hexists
 */
exports.hexists = function (mockInstance, hash, key, callback) {

  var b = 0;
  var err = null;

  if (mockInstance.storage[hash]) {
    if (mockInstance.storage[hash].type === "hash") {
      b = mockInstance.storage[hash].value[key] === undefined ? 0 : 1;
    } else {
      err = new Error("ERR Operation against a key holding the wrong kind of value");
    }
  }

  mockInstance._callCallback(callback, err, b);
}

/**
 * Hdel
 */
exports.hdel = function (mockInstance, hash) {

  var nb = 0;
  var err = null;

  // We require at least 3 arguments:
  // 0: mockInstance
  // 1: hash name
  // 2..N-1: key
  // N: callback (optional)

  var len = arguments.length;
  if (len < 3) {
    return;
  }

  var callback;
  if ('function' === typeof arguments[len - 1]) {
    callback = arguments[len-1];
  }

  if (mockInstance.storage[hash]) {
    if (mockInstance.storage[hash].type === "hash") {
      for (var i = 2; i < len; i += 1) {
        if (len <= (i + 1)) {
          // should skip the callback here
          break;
        }
        var k = arguments[i];
        if (mockInstance.storage[hash].value[k]) {
          delete mockInstance.storage[hash].value[k];
          nb++;
        }
      }
    } else {
      err = new Error("ERR Operation against a key holding the wrong kind of value");
    }
  }

  // Do we have a callback?
  if (callback) {
    mockInstance._callCallback(callback, err, nb);
  }
}

/*
 * Hset
 */
exports.hset = function (mockInstance, hash, key, value, callback) {
  var update = false;

  if (mockInstance.storage[hash]) {
    if (mockInstance.storage[hash].type !== "hash") {
      return mockInstance._callCallback(callback,
        new Error("ERR Operation against a key holding the wrong kind of value"));
    }
    if (mockInstance.storage[hash].value[key]) {
      update = true;
    }
  } else {
    mockInstance.storage[hash] = Item.createHash();
  }

  mockInstance.storage[hash].value[key] = value.toString();

  mockInstance._callCallback(callback, null, update ? 0 : 1);
};

/**
 * Hsetnx
 */
exports.hsetnx = function (mockInstance, hash, key, value, callback) {
  if (!mockInstance.storage[hash]
    || mockInstance.storage[hash].type !== "hash"
    || !mockInstance.storage[hash].value[key]) {
    exports.hset(mockInstance, hash, key, value, callback);
  } else {
    mockInstance._callCallback(callback, null, 0);
  }

};

/**
 * Hincrby
 */
exports.hincrby = function (mockInstance, hash, key, increment, callback) {

  if (mockInstance.storage[hash]) {
    if (mockInstance.storage[hash].type !== "hash") {
      return mockInstance._callCallback(callback,
        new Error("ERR Operation against a key holding the wrong kind of value"));
    }
  } else {
    mockInstance.storage[hash] = Item.createHash();
  }

  if (mockInstance.storage[hash].value[key] && !/^\d+$/.test(mockInstance.storage[hash].value[key])) {
    return mockInstance._callCallback(callback,
      new Error("ERR hash value is not an integer"));
  }

  mockInstance.storage[hash].value[key] = parseInt(mockInstance.storage[hash].value[key]) || 0;

  mockInstance.storage[hash].value[key] += increment;

  mockInstance.storage[hash].value[key] += ""; //Because HGET returns Strings

  mockInstance._callCallback(callback, null, parseInt(mockInstance.storage[hash].value[key])); //Because HINCRBY returns integers
};

/**
 * Hincrbyfloat
 */
exports.hincrbyfloat = function (mockInstance, hash, key, increment, callback) {

  if (mockInstance.storage[hash]) {
    if (mockInstance.storage[hash].type !== "hash") {
      return mockInstance._callCallback(callback,
        new Error("ERR Operation against a key holding the wrong kind of value"));
    }
  } else {
    mockInstance.storage[hash] = Item.createHash();
  }

  function isFloat(n) {
      return n === +n && n !== (n|0);
  }

  if (mockInstance.storage[hash].value[key] && !isFloat(parseFloat(mockInstance.storage[hash].value[key]))) {
    return mockInstance._callCallback(callback,
      new Error("ERR value is not a valid float"));
  }

  mockInstance.storage[hash].value[key] = parseFloat(mockInstance.storage[hash].value[key]) || 0;
  mockInstance.storage[hash].value[key] += parseFloat(increment);
  //convert to string
  mockInstance.storage[hash].value[key] = mockInstance.storage[hash].value[key].toString();

  mockInstance._callCallback(callback, null, mockInstance.storage[hash].value[key]);
};

/**
 * Hgetall
 */
exports.hgetall = function (mockInstance, hash, callback) {

  // TODO: Confirm if this should return null or empty obj when key does not exist
  var obj = {};
  var nb = 0;

  if (mockInstance.storage[hash] && mockInstance.storage[hash].type !== "hash") {
    return mockInstance._callCallback(callback,
      new Error("ERR Operation against a key holding the wrong kind of value"));
  }
  if (mockInstance.storage[hash]) {
    for (var k in mockInstance.storage[hash].value) {
      nb++;
      obj[k] = mockInstance.storage[hash].value[k];
    }
  }

  mockInstance._callCallback(callback, null, nb === 0 ? null : obj);
}

/**
 * Hscan
 */

exports.hscan = function (mockInstance, hash, index, pattern, count, callback) {
  var regex = patternToRegex(pattern);
  var keyvals = [];
  var idx = 1;
  var resIdx = 0;
  count = count || 10;

  if (mockInstance.storage[hash] && mockInstance.storage[hash].type !== "hash") {
    return mockInstance._callCallback(callback, null, ['0',[]]);
  }
  if (mockInstance.storage[hash]) {
    for (var key in mockInstance.storage[hash].value) {
      if (idx >= index && regex.test(key)) {
        keyvals.push(key);
        keyvals.push(mockInstance.storage[hash].value[key]);
        count--;
        if(count === 0) {
          resIdx = idx+1;
          break;
        }
      }
      idx++;
    }
  }

  mockInstance._callCallback(callback, null, [resIdx.toString(), keyvals]);
}

/**
 * Hkeys
 */
exports.hkeys = function (mockInstance, hash, callback) {

  var list = [];

  if (mockInstance.storage[hash] && mockInstance.storage[hash].type !== "hash") {
    return mockInstance._callCallback(callback,
      new Error("ERR Operation against a key holding the wrong kind of value"));
  }
  if (mockInstance.storage[hash]) {
    for (var k in mockInstance.storage[hash].value) {
      list.push(k);
    }
  }

  mockInstance._callCallback(callback, null, list);
}

/**
 * Hvals
 */
exports.hvals = function (mockInstance, hash, callback) {

  var list = [];

  if (mockInstance.storage[hash] && mockInstance.storage[hash].type !== "hash") {
    return mockInstance._callCallback(callback,
      new Error("ERR Operation against a key holding the wrong kind of value"));
  }
  if (mockInstance.storage[hash]) {
    for (var k in mockInstance.storage[hash].value) {
      list.push(mockInstance.storage[hash].value[k]);
    }
  }

  mockInstance._callCallback(callback, null, list);
}

/**
 * Hmset
 */
exports.hmset = function (mockInstance, hash) {

  // We require at least 3 arguments
  // 0: mockInstance
  // 1: hash name
  // 2..N-2: key
  // 3..N-1: value
  // N: callback (optional)

  var len = arguments.length;
  if (len <= 3) {
    return;
  }

  var callback;
  if ('function' === typeof arguments[len - 1]) {
    callback = arguments[len-1];
  }

  // check to see if this hash exists
  if (mockInstance.storage[hash]) {
    if (mockInstance.storage[hash].type !== "hash" && callback) {
      return mockInstance._callCallback(callback,
        new Error("ERR Operation against a key holding the wrong kind of value"));
    }
  } else {
    mockInstance.storage[hash] = Item.createHash();
  }

  for (var i = 2; i < len; i += 2) {
    if (len <= (i + 1)) {
      // should skip the callback here
      break;
    }
    var k = arguments[i];
    var v = arguments[i + 1];
    mockInstance.storage[hash].value[k] = v.toString();
  }

  // Do we have a callback?
  if (callback) {
    mockInstance._callCallback(callback, null, "OK");
  }
}

/**
 * Hmget
 */
exports.hmget = function (mockInstance) {

  // We require at least 3 arguments
  // 0: mockInstance
  // 1: hash name
  // 2: key/value object or first key name
  if (arguments.length <= 3) {
    return;
  }

  var keyValuesToGet = [];

  for (var i = 2; i < arguments.length; i++) {

    // Neither key nor value is a callback
    if ('function' !== typeof arguments[i] && 'function' !== typeof arguments[i]) {

      keyValuesToGet.push(arguments[i]);

    } else {
      break;
    }
  }

  var err = null
  var keyValues = null;
  var hash = arguments[1];

  if (mockInstance.storage[hash]) {
    if (mockInstance.storage[hash].type !== "hash") {
      err = new Error("ERR Operation against a key holding the wrong kind of value");
    } else {
      keyValues = []
      for (var k in keyValuesToGet) {
        keyValues.push(mockInstance.storage[hash].value[keyValuesToGet[k]] || null)
      }
    }
  } else {
    keyValues = []
    for (k in keyValuesToGet) {
      keyValues.push(null)
    }
  }

  // Do we have a callback?
  if ('function' === typeof arguments[arguments.length - 1]) {
    mockInstance._callCallback(arguments[arguments.length - 1], err, keyValues);
  }
}

/**
 * Hlen
 */
exports.hlen = function (mockInstance, hash, callback) {

  if (!mockInstance.storage[hash]) {
    return mockInstance._callCallback(callback, null, 0);
  }
  if (mockInstance.storage[hash].type !== "hash") {
    return mockInstance._callCallback(callback,
      new Error("ERR Operation against a key holding the wrong kind of value"));
  }
  var cnt = 0;
  for (var p in mockInstance.storage[hash].value) {
    if (mockInstance.storage[hash].value.hasOwnProperty(p)) {
      cnt++;
    }
  }

  mockInstance._callCallback(callback, null, cnt);
}
