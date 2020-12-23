const Item = require("./item.js");
const helpers = require('../helpers');
const { Buffer } = require("buffer");

// Create a string or buffer Item depending on input value
const createItem = function (value) {
  return value instanceof Buffer ? Item.createBuffer(value) : Item.createString(value);
};

// Allowable types for string operations
const validType = (item) => item.type === 'string' || item.type === 'buffer';

const _isFloat = (s) => parseFloat(s) == s; // eslint-disable-line eqeqeq
const _isInteger = (s) => parseInt(s, 10) == s; // eslint-disable-line eqeqeq

/**
 * Set
 *
 * [EX seconds|PX milliseconds|KEEPTTL] [NX|XX] [GET]
 *
 * TODO: introduce support for GET
 */
exports.set = function (key, value, callback, args = {}) {
  const getExpirationTime = () => {
    if (args.ex) {
      return args.ex;
    }
    if (args.px) {
      return args.px / 1000;
    }
    return undefined;
  };

  const keyExists = key in this.storage;
  const expirationTime = getExpirationTime();

  if ((keyExists && args.xx) || (!keyExists && args.nx) || (!args.xx && !args.nx)) {
    // it it's okay to set the value
    this.storage[key] = createItem(value);
  }

  if (expirationTime) {
    this.expire(key, expirationTime, (err, result) => {
      helpers.callCallback(callback, err, "OK");
    });
  } else {
    helpers.callCallback(callback, null, "OK");
  }
};

exports.append = function(key, value, cb) {
  let existing = this.get(key);
  if (typeof existing !== 'string') {
    existing = '';
  }
  const newValue = existing + value;
  this.set(key, newValue);
  helpers.callCallback(cb, null, newValue.length);
};

/**
 * Ping
 */
exports.ping = function (callback) {
  helpers.callCallback(callback, null, "PONG");
};

/**
* Setnx
*/
exports.setnx = function (key, value, callback) {
  const self = this;
  if (key in this.storage) {
    helpers.callCallback(callback, null, 0);
  } else {
    this.set(key, value, /*callback);,*/ function() {
      helpers.callCallback(callback, null, 1);
    });
  }
};

/**
 * Get
 */
exports.get = function (key, callback) {

  let value = null;
  let err = null;

  const storedValue = this.storage[key];
  if (storedValue) {
    if (!validType(storedValue)) {
      err = new Error("WRONGTYPE Operation against a key holding the wrong kind of value");
    } else if (storedValue.type === 'string') {
      value = storedValue.value;
      if (key instanceof Buffer) {
        value = new Buffer(value);
      }
    } else if (storedValue.type === 'buffer') {
      value = storedValue.value;
      if (typeof key === 'string') {
        value = value.toString();
      }
    }
  }

  helpers.callCallback(callback, err, value);
  return value;
};

/**
 * Getset
 */
exports.getset = function (key, value, callback) {
  const self = this;
  this.get(key, /*callback);,*/ function(err, oldValue) {
    if (err) {
      return helpers.callCallback(callback, err, null);
    }

    self.storage[key] = createItem(value);

    helpers.callCallback(callback, err, oldValue);
  });
};

/**
 * mget
 */
exports.mget = function (...args) {

  let keys = [];
  let err = null;

  // Build up the set of keys
  if ('object' === typeof args[0]) {
    keys = args[0];
  } else {
    for (let i = 0; i < args.length; i++) {
      const key = args[i];
      if ('function' !== typeof key) {
        keys.push(key);
      }
    }
  }

  const values = [];
  for (let j = 0; j < keys.length; j++) {
    this.get(keys[j], function(e, value) {
      if (e) {
        err = e;
      } else {
        values.push(value);
      }
    });
  }

  if ('function' === typeof args[args.length - 1]) {
    helpers.callCallback(args[args.length - 1], err, values);
  }

};

/**
 * mset
 */
exports.mset = function (useNX, ...funArgs) {

  const keys = [];
  const values = [];
  let err = null;
  let callback;
  let numCallbacks;

  if ('object' === typeof funArgs[0]) {
    if ((funArgs[0].length & 1) === 1) { // eslint-disable-line no-bitwise
      err = {
        command: useNX ? "MSETNX" : "MSET",
        args: funArgs[1],
        code: "ERR"
      };
    } else {
      for (let i = 0; i < funArgs[0].length; i++) {
        if (i % 2 === 0) {
          keys.push(funArgs[0][i]);
        } else {
          values.push(funArgs[0][i]);
        }
      }
    }
    callback = funArgs[1];
  } else {
    const args = [];
    let last;
    for (let i = 0; i < funArgs.length; i++) {
      last = args[i] = funArgs[i];
    }
    if ('function' === typeof last) {
      callback = args.pop();
    }
    if ((args.length & 1) === 1) { // eslint-disable-line no-bitwise
      err = {
        command: useNX ? "MSETNX" : "MSET",
        args: args,
        code: "ERR"
      };
    } else {
      while (args.length !== 0) {
        keys.push(args.shift());
        values.push(args.shift());
      }
    }
  }

  numCallbacks = keys.length;
  if (numCallbacks === 0) {
    err = err || {
      command: useNX ? "MSETNX" : "MSET",
      code: "ERR"
    };
    helpers.callCallback(callback, err);
  } else {
    if (useNX) {
      let allClear = true;
      for (let i = 0; i < keys.length; i++) {
        if (keys[i] in this.storage) {
          allClear = false;
          break;
        }
      }
      if (!allClear) {
        helpers.callCallback(callback, null, 0);
        return;
      }
    }
    for (let i = 0; i < keys.length; i++) {
      const self = this;
      this.set(keys[i], values[i], function(cberr) {
        if (cberr) {
          err = cberr;
        }
        if (--numCallbacks === 0) {
          const response = useNX ? 1 : "OK";
          helpers.callCallback(callback, err, err ? undefined : response);
        }
      });
    }
  }
};

/**
 * Incr
 */
exports.incr = function (key, callback) {

  if (!this.storage[key]) {
    const number = 1;
    this.set(key, number);
    helpers.callCallback(callback, null, number);

  } else if (this.storage[key].type !== "string") {
    const err = new Error("WRONGTYPE Operation against a key holding the wrong kind of value");
    helpers.callCallback(callback, err, null);

  } else if (_isInteger(this.storage[key].value)) {
    const number = parseInt(this.storage[key].value, 10) + 1;
    this.storage[key].value = number.toString();
    helpers.callCallback(callback, null, number);

  } else {
    const err = new Error("ERR value is not an integer or out of range");
    helpers.callCallback(callback, err, null);
  }
};

/**
 * Incrby
 */
exports.incrby = function (key, value, callback) {

  value = parseInt(value, 10);

  if (!this.storage[key]) {
    const number = value;
    this.set(key, number);
    helpers.callCallback(callback, null, number);

  } else if (this.storage[key].type !== "string") {
    const err = new Error("WRONGTYPE Operation against a key holding the wrong kind of value");
    helpers.callCallback(callback, err, null);

  } else if (_isInteger(this.storage[key].value)) {
    const number = parseInt(this.storage[key].value, 10) + value;
    this.storage[key].value = number.toString();
    helpers.callCallback(callback, null, number);

  } else {
    const err = new Error("ERR value is not an integer or out of range");
    helpers.callCallback(callback, err, null);
  }
};

/**
 * Incrbyfloat
 */
exports.incrbyfloat = function (key, value, callback) {

  if (!this.storage[key]) {
    const number = parseFloat(value);
    this.set(key, number.toString());
    helpers.callCallback(callback, null, number.toString());

  } else if (this.storage[key].type !== "string") {
    const err = new Error("WRONGTYPE Operation against a key holding the wrong kind of value");
    helpers.callCallback(callback, err, null);

  } else if (_isFloat(this.storage[key].value) && _isFloat(value)) {
    const number = parseFloat(this.storage[key].value) + parseFloat(value);
    this.storage[key].value = number.toString();
    helpers.callCallback(callback, null, number.toString());

  } else {
    const err = new Error("ERR value is not a valid float");
    helpers.callCallback(callback, err, null);
  }
};

/**
 * Decr
 */
exports.decr = function (key, callback) {

  if (!this.storage[key]) {
    const number = -1;
    this.set(key, number);
    helpers.callCallback(callback, null, number);

  } else if (this.storage[key].type !== "string") {
    const err = new Error("WRONGTYPE Operation against a key holding the wrong kind of value");
    helpers.callCallback(callback, err, null);

  } else if (_isInteger(this.storage[key].value)) {
    const number = parseInt(this.storage[key].value, 10) - 1;
    this.storage[key].value = number.toString();
    helpers.callCallback(callback, null, number);

  } else {
    const err = new Error("ERR value is not an integer or out of range");
    helpers.callCallback(callback, err, null);
  }
};

/**
 * Decrby
 */
exports.decrby = function (key, value, callback) {

  value = parseInt(value, 10);

  if (!this.storage[key]) {
    const number = 0 - value;
    this.set(key, number);
    helpers.callCallback(callback, null, number);

  } else if (this.storage[key].type !== "string") {
    const err = new Error("WRONGTYPE Operation against a key holding the wrong kind of value");
    helpers.callCallback(callback, err, null);

  } else if (_isInteger(this.storage[key].value)) {
    const number = parseInt(this.storage[key].value, 10) - value;
    this.storage[key].value = number.toString();
    helpers.callCallback(callback, null, number);

  } else {
    const err = new Error("ERR value is not an integer or out of range");
    helpers.callCallback(callback, err, null);
  }
};
