/**
 * Module dependencies
 */
const Item = require("./item.js");
const helpers = require('../helpers');
const patternToRegex = require('../helpers').patternToRegex;

/**
 * Hget
 */
exports.hget = function (hash, key, callback) {

  var value = null;
  var err = null;

  if (this.storage[hash]) {
    if (this.storage[hash].type === "hash") {
      if (this.storage[hash].value.hasOwnProperty(key)) {
        value = this.storage[hash].value[key];
      } else {
        value = null;
      }
    } else {
      err = new Error("ERR Operation against a key holding the wrong kind of value");
    }
  }

  helpers.callCallback(callback, err, value);
};

/**
 * Hexists
 */
exports.hexists = function (hash, key, callback) {

  var b = 0;
  var err = null;

  if (this.storage[hash]) {
    if (this.storage[hash].type === "hash") {
      b = this.storage[hash].value[key] === undefined ? 0 : 1;
    } else {
      err = new Error("ERR Operation against a key holding the wrong kind of value");
    }
  }

  helpers.callCallback(callback, err, b);
};

/**
 * Hdel
 */
exports.hdel = function (hash) {

  var nb = 0;
  var err = null;

  // We require at least 3 arguments:
  // 0: mockInstance
  // 1: hash name
  // 2..N-1: key
  // N: callback (optional)

  var len = arguments.length;
  if (len < 2) {
    return;
  }

  var callback;
  if ('function' === typeof arguments[len - 1]) {
    callback = arguments[len-1];
  }

  if (this.storage[hash]) {
    if (this.storage[hash].type === "hash") {
      for (var i = 1; i < len; i += 1) {
        if (len <= (i + 1)) {
          // should skip the callback here
          break;
        }
        var k = arguments[i];
        if (this.storage[hash].value[k]) {
          delete this.storage[hash].value[k];
          nb++;
        }
      }
    } else {
      err = new Error("ERR Operation against a key holding the wrong kind of value");
    }
  }

  // Do we have a callback?
  if (callback) {
    helpers.callCallback(callback, err, nb);
  }
};

/*
 * Hset
 */
exports.hset = function (hash, key, value, callback) {
  var update = false;

  if (this.storage[hash]) {
    if (this.storage[hash].type !== "hash") {
      return helpers.callCallback(callback,
        new Error("ERR Operation against a key holding the wrong kind of value"));
    }
    if (this.storage[hash].value[key]) {
      update = true;
    }
  } else {
    this.storage[hash] = Item.createHash();
  }

  this.storage[hash].value[key] = value.toString();

  helpers.callCallback(callback, null, update ? 0 : 1);
};

/**
 * Hsetnx
 */
exports.hsetnx = function (hash, key, value, callback) {
  if (!this.storage[hash]
    || this.storage[hash].type !== "hash"
    || !this.storage[hash].value[key]) {
    this.hset(hash, key, value, callback);
  } else {
    helpers.callCallback(callback, null, 0);
  }

};

/**
 * Hincrby
 */
exports.hincrby = function (hash, key, increment, callback) {

  if (this.storage[hash]) {
    if (this.storage[hash].type !== "hash") {
      return helpers.callCallback(callback,
        new Error("ERR Operation against a key holding the wrong kind of value"));
    }
  } else {
    this.storage[hash] = Item.createHash();
  }

  if (this.storage[hash].value[key] && !/^\d+$/.test(this.storage[hash].value[key])) {
    return helpers.callCallback(callback,
      new Error("ERR hash value is not an integer"));
  }

  this.storage[hash].value[key] = parseInt(this.storage[hash].value[key], 10) || 0;

  this.storage[hash].value[key] += increment;

  this.storage[hash].value[key] += ""; //Because HGET returns Strings

  helpers.callCallback(callback, null, parseInt(this.storage[hash].value[key], 10)); //Because HINCRBY returns integers
};

/**
 * Hincrbyfloat
 */
exports.hincrbyfloat = function (hash, key, increment, callback) {

  if (this.storage[hash]) {
    if (this.storage[hash].type !== "hash") {
      return helpers.callCallback(callback,
        new Error("ERR Operation against a key holding the wrong kind of value"));
    }
  } else {
    this.storage[hash] = Item.createHash();
  }

  function isFloat(n) {
      return n === +n && n !== (n|0);
  }

  if (this.storage[hash].value[key] && !isFloat(parseFloat(this.storage[hash].value[key]))) {
    return helpers.callCallback(callback,
      new Error("ERR value is not a valid float"));
  }

  this.storage[hash].value[key] = parseFloat(this.storage[hash].value[key]) || 0;
  this.storage[hash].value[key] += parseFloat(increment);
  //convert to string
  this.storage[hash].value[key] = this.storage[hash].value[key].toString();

  helpers.callCallback(callback, null, this.storage[hash].value[key]);
};

/**
 * Hgetall
 */
exports.hgetall = function (hash, callback) {

  // TODO: Confirm if this should return null or empty obj when key does not exist
  var obj = {};
  var nb = 0;

  if (this.storage[hash] && this.storage[hash].type !== "hash") {
    return helpers.callCallback(callback,
      new Error("ERR Operation against a key holding the wrong kind of value"));
  }
  if (this.storage[hash]) {
    for (var k in this.storage[hash].value) {
      nb++;
      obj[k] = this.storage[hash].value[k];
    }
  }

  helpers.callCallback(callback, null, nb === 0 ? null : obj);
};

/**
 * Hscan
 */

exports.hscan = function (hash, index, pattern, count, callback) {
  var regex = patternToRegex(pattern);
  var keyvals = [];
  var idx = 1;
  var resIdx = 0;
  count = count || 10;

  if (this.storage[hash] && this.storage[hash].type !== "hash") {
    return helpers.callCallback(callback, null, ['0',[]]);
  }
  if (this.storage[hash]) {
    for (var key in this.storage[hash].value) {
      if (idx >= index && regex.test(key)) {
        keyvals.push(key);
        keyvals.push(this.storage[hash].value[key]);
        count--;
        if(count === 0) {
          resIdx = idx+1;
          break;
        }
      }
      idx++;
    }
  }

  helpers.callCallback(callback, null, [resIdx.toString(), keyvals]);
};

/**
 * Hkeys
 */
exports.hkeys = function (hash, callback) {

  var list = [];

  if (this.storage[hash] && this.storage[hash].type !== "hash") {
    return helpers.callCallback(callback,
      new Error("ERR Operation against a key holding the wrong kind of value"));
  }
  if (this.storage[hash]) {
    for (var k in this.storage[hash].value) {
      list.push(k);
    }
  }

  helpers.callCallback(callback, null, list);
};

/**
 * Hvals
 */
exports.hvals = function (hash, callback) {

  var list = [];

  if (this.storage[hash] && this.storage[hash].type !== "hash") {
    return helpers.callCallback(callback,
      new Error("ERR Operation against a key holding the wrong kind of value"));
  }
  if (this.storage[hash]) {
    for (var k in this.storage[hash].value) {
      list.push(this.storage[hash].value[k]);
    }
  }

  helpers.callCallback(callback, null, list);
};

/**
 * Hmset
 */
exports.hmset = function (hash) {

  // We require at least 3 arguments
  // 0: mockInstance
  // 1: hash name
  // 2..N-2: key
  // 3..N-1: value
  // N: callback (optional)

  var len = arguments.length;
  if (len <= 2) {
    return;
  }

  var callback;
  if ('function' === typeof arguments[len - 1]) {
    callback = arguments[len-1];
  }

  // check to see if this hash exists
  if (this.storage[hash]) {
    if (this.storage[hash].type !== "hash" && callback) {
      return helpers.callCallback(callback,
        new Error("ERR Operation against a key holding the wrong kind of value"));
    }
  } else {
    this.storage[hash] = Item.createHash();
  }

  for (var i = 1; i < len; i += 2) {
    if (len <= (i + 1)) {
      // should skip the callback here
      break;
    }
    var k = arguments[i];
    var v = arguments[i + 1];
    this.storage[hash].value[k] = v.toString();
  }

  // Do we have a callback?
  if (callback) {
    helpers.callCallback(callback, null, "OK");
  }
};

/**
 * Hmget
 */
exports.hmget = function (mockInstance) {

  // We require at least 3 arguments
  // 1: hash name
  // 2: key/value object or first key name
  if (arguments.length <= 2) {

    if ('function' === typeof arguments[arguments.length - 1]) {
      helpers.callCallback(
        arguments[arguments.length - 1],
        new Error("ERR wrong number of arguments for 'hmget' command"),
        keyValues
      );
    }

    return;
  }

  var keyValuesToGet = [];

  for (var i = 1; i < arguments.length; i++) {

    // Neither key nor value is a callback
    if ('function' !== typeof arguments[i] && 'function' !== typeof arguments[i]) {

      keyValuesToGet.push(arguments[i]);

    } else {
      break;
    }
  }

  var err = null;
  var keyValues = null;
  var hash = arguments[0];

  if (this.storage[hash]) {
    if (this.storage[hash].type !== "hash") {
      err = new Error("ERR Operation against a key holding the wrong kind of value");
    } else {
      keyValues = [];
      for (var k in keyValuesToGet) {
        keyValues.push(this.storage[hash].value[keyValuesToGet[k]] || null);
      }
    }
  } else {
    keyValues = [];
    for (k in keyValuesToGet) {
      keyValues.push(null);
    }
  }

  // Do we have a callback?
  if ('function' === typeof arguments[arguments.length - 1]) {
    helpers.callCallback(arguments[arguments.length - 1], err, keyValues);
  }
};

/**
 * Hlen
 */
exports.hlen = function (hash, callback) {

  if (!this.storage[hash]) {
    return helpers.callCallback(callback, null, 0);
  }
  if (this.storage[hash].type !== "hash") {
    return helpers.callCallback(callback,
      new Error("ERR Operation against a key holding the wrong kind of value"));
  }
  var cnt = 0;
  for (var p in this.storage[hash].value) {
    if (this.storage[hash].value.hasOwnProperty(p)) { // eslint-disable-line no-prototype-builtins
      cnt++;
    }
  }

  helpers.callCallback(callback, null, cnt);
};
