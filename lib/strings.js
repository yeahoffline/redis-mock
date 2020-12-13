const Item = require("./item.js");
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
 */
exports.set = function (key, value, callback) {
  this.storage[key] = createItem(value);

  this._callCallback(callback, null, "OK");
};

/**
 * Ping
 */
exports.ping = function (callback) {
  this._callCallback(callback, null, "PONG");
};

/**
* Setnx
*/
exports.setnx = function (key, value, callback) {
  const self = this;
  if (key in this.storage) {
    this._callCallback(callback, null, 0);
  } else {
    this.set(key, value, /*callback);,*/ function() {
      self._callCallback(callback, null, 1);
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

  this._callCallback(callback, err, value);
}

/**
 * Getset
 */
exports.getset = function (key, value, callback) {
  const self = this;
  this.get(key, /*callback);,*/ function(err, oldValue) {
    if (err) {
      return self._callCallback(callback, err, null);
    }

    self.storage[key] = createItem(value);

    self._callCallback(callback, err, oldValue);
  });
};

/**
 * mget
 */
exports.mget = function (...arguments) {

  let keys = [];
  let err = null;

  // Build up the set of keys
  if ('object' === typeof arguments[0]) {
    keys = arguments[0];
  } else {
    for (let i = 0; i < arguments.length; i++) {
      const key = arguments[i];
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

  if ('function' === typeof arguments[arguments.length - 1]) {
    this._callCallback(arguments[arguments.length - 1], err, values);
  }

}

/**
 * mset
 */
exports.mset = function (useNX, ...arguments) { // eslint-disable-line complexity

  const keys = [];
  const values = [];
  let err = null;
  let callback;
  let numCallbacks;

  if ('object' === typeof arguments[0]) {
    if ((arguments[0].length & 1) === 1) { // eslint-disable-line no-bitwise
      err = {
        command: useNX ? "MSETNX" : "MSET",
        args: arguments[1],
        code: "ERR"
      };
    } else {
      for (let i = 0; i < arguments[0].length; i++) {
        if (i % 2 === 0) {
          keys.push(arguments[0][i]);
        } else {
          values.push(arguments[0][i]);
        }
      }
    }
    callback = arguments[1];
  } else {
    const args = [];
    let last;
    for (let i = 0; i < arguments.length; i++) {
      last = args[i] = arguments[i];
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
        keys.push(args.shift())
        values.push(args.shift())
      }
    }
  }

  numCallbacks = keys.length;
  if (numCallbacks === 0) {
    err = err || {
      command: useNX ? "MSETNX" : "MSET",
      code: "ERR"
    };
    this._callCallback(callback, err);
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
        this._callCallback(callback, null, 0);
        return
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
          self._callCallback(callback, err, err ? undefined : response);
        }
      });
    }
  }
}

/**
 * Incr
 */
exports.incr = function (key, callback) {

  if (!this.storage[key]) {
    const number = 1;
    this.set(key, number);
    this._callCallback(callback, null, number);

  } else if (this.storage[key].type !== "string") {
    const err = new Error("WRONGTYPE Operation against a key holding the wrong kind of value");
    this._callCallback(callback, err, null);

  } else if (_isInteger(this.storage[key].value)) {
    const number = parseInt(this.storage[key].value, 10) + 1;
    this.storage[key].value = number.toString();
    this._callCallback(callback, null, number);

  } else {
    const err = new Error("ERR value is not an integer or out of range");
    this._callCallback(callback, err, null);
  }
}

/**
 * Incrby
 */
exports.incrby = function (key, value, callback) {

  value = parseInt(value, 10);

  if (!this.storage[key]) {
    const number = value;
    this.set(key, number);
    this._callCallback(callback, null, number);

  } else if (this.storage[key].type !== "string") {
    const err = new Error("WRONGTYPE Operation against a key holding the wrong kind of value");
    this._callCallback(callback, err, null);

  } else if (_isInteger(this.storage[key].value)) {
    const number = parseInt(this.storage[key].value, 10) + value;
    this.storage[key].value = number.toString();
    this._callCallback(callback, null, number);

  } else {
    const err = new Error("ERR value is not an integer or out of range");
    this._callCallback(callback, err, null);
  }
}

/**
 * Incrbyfloat
 */
exports.incrbyfloat = function (key, value, callback) {

  if (!this.storage[key]) {
    const number = parseFloat(value);
    this.set(key, number.toString());
    this._callCallback(callback, null, number.toString());

  } else if (this.storage[key].type !== "string") {
    const err = new Error("WRONGTYPE Operation against a key holding the wrong kind of value");
    this._callCallback(callback, err, null);

  } else if (_isFloat(this.storage[key].value) && _isFloat(value)) {
    const number = parseFloat(this.storage[key].value) + parseFloat(value);
    this.storage[key].value = number.toString();
    this._callCallback(callback, null, number.toString());

  } else {
    const err = new Error("ERR value is not a valid float");
    this._callCallback(callback, err, null);
  }
}

/**
 * Decr
 */
exports.decr = function (key, callback) {

  if (!this.storage[key]) {
    const number = -1;
    this.set(key, number);
    this._callCallback(callback, null, number);

  } else if (this.storage[key].type !== "string") {
    const err = new Error("WRONGTYPE Operation against a key holding the wrong kind of value");
    this._callCallback(callback, err, null);

  } else if (_isInteger(this.storage[key].value)) {
    const number = parseInt(this.storage[key].value, 10) - 1;
    this.storage[key].value = number.toString();
    this._callCallback(callback, null, number);

  } else {
    const err = new Error("ERR value is not an integer or out of range");
    this._callCallback(callback, err, null);
  }
}

/**
 * Decrby
 */
exports.decrby = function (key, value, callback) {

  value = parseInt(value, 10);

  if (!this.storage[key]) {
    const number = 0 - value;
    this.set(key, number);
    this._callCallback(callback, null, number);

  } else if (this.storage[key].type !== "string") {
    const err = new Error("WRONGTYPE Operation against a key holding the wrong kind of value");
    this._callCallback(callback, err, null);

  } else if (_isInteger(this.storage[key].value)) {
    const number = parseInt(this.storage[key].value, 10) - value;
    this.storage[key].value = number.toString();
    this._callCallback(callback, null, number);

  } else {
    const err = new Error("ERR value is not an integer or out of range");
    this._callCallback(callback, err, null);
  }
}
