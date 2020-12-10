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
exports.set = function (mockInstance, key, value, callback) {

  mockInstance.storage[key] = createItem(value);

  mockInstance._callCallback(callback, null, "OK");
};

/**
 * Ping
 */
exports.ping = function (mockInstance, callback) {

  mockInstance._callCallback(callback, null, "PONG");
};

/**
* Setnx
*/
exports.setnx = function (mockInstance, key, value, callback) {
  if (key in mockInstance.storage) {
    mockInstance._callCallback(callback, null, 0);
  } else {
    exports.set(mockInstance, key, value, /*callback);,*/ function() {
      mockInstance._callCallback(callback, null, 1);
    });
  }
};

/**
 * Get
 */
exports.get = function (mockInstance, key, callback) {

  var value = null;
  var err = null;

  var storedValue = mockInstance.storage[key];
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

  mockInstance._callCallback(callback, err, value);
}

/**
 * Getset
 */
exports.getset = function (mockInstance, key, value, callback) {

  exports.get(mockInstance, key, /*callback);,*/ function(err, oldValue) {
    if (err) {
      return mockInstance._callCallback(callback, err, null);
    }

    mockInstance.storage[key] = createItem(value);

    mockInstance._callCallback(callback, err, oldValue);
  });
};

/**
 * mget
 */
exports.mget = function (mockInstance) {

  var keys = [];
  var err = null;

  // Build up the set of keys
  if ('object' === typeof arguments[1]) {
    keys = arguments[1];
  } else {
    for (var i = 1; i < arguments.length; i++) {
      var key = arguments[i];
      if ('function' !== typeof key) {
        keys.push(key);
      }
    }
  }

  var values = [];
  for (var j = 0; j < keys.length; j++) {
    exports.get(mockInstance, keys[j], function(e, value) {
      if (e) {
        err = e;
      } else {
        values.push(value);
      }
    });
  }

  if ('function' === typeof arguments[arguments.length - 1]) {
    mockInstance._callCallback(arguments[arguments.length - 1], err, values);
  }

}

/**
 * mset
 */
exports.mset = function (mockInstance, useNX) { // eslint-disable-line complexity

  var keys = [];
  var values = [];
  var err = null;
  var callback;
  var numCallbacks;

  if ('object' === typeof arguments[2]) {
    if ((arguments[2].length & 1) === 1) { // eslint-disable-line no-bitwise
      err = {
        command: useNX ? "MSETNX" : "MSET",
        args: arguments[1],
        code: "ERR"
      };
    } else {
      for (var i = 0; i < arguments[2].length; i++) {
        if (i % 2 === 0) {
          keys.push(arguments[2][i]);
        } else {
          values.push(arguments[2][i]);
        }
      }
    }
    callback = arguments[3]
  } else {
    var args = [];
    var last;
    for ( i = 2; i < arguments.length; i++) {
      last = args[i - 2] = arguments[i];
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
    mockInstance._callCallback(callback, err);
  } else {
    if (useNX) {
      var allClear = true;
      for (i = 0; i < keys.length; i++) {
        if (keys[i] in mockInstance.storage) {
          allClear = false;
          break;
        }
      }
      if (!allClear) {
        mockInstance._callCallback(callback, null, 0);
        return
      }
    }
    for (i = 0; i < keys.length; i++) {
      exports.set(mockInstance, keys[i], values[i], function(cberr) {
        if (cberr) {
          err = cberr;
        }
        if (--numCallbacks === 0) {
          var response = useNX ? 1 : "OK";
          mockInstance._callCallback(callback, err, err ? undefined : response);
        }
      });
    }
  }
}

/**
 * Incr
 */
exports.incr = function (mockInstance, key, callback) {

  if (!mockInstance.storage[key]) {
    const number = 1;
    exports.set(mockInstance, key, number);
    mockInstance._callCallback(callback, null, number);

  } else if (mockInstance.storage[key].type !== "string") {
    const err = new Error("WRONGTYPE Operation against a key holding the wrong kind of value");
    mockInstance._callCallback(callback, err, null);

  } else if (_isInteger(mockInstance.storage[key].value)) {
    const number = parseInt(mockInstance.storage[key].value, 10) + 1;
    mockInstance.storage[key].value = number.toString();
    mockInstance._callCallback(callback, null, number);

  } else {
    const err = new Error("ERR value is not an integer or out of range");
    mockInstance._callCallback(callback, err, null);
  }
}

/**
 * Incrby
 */
exports.incrby = function (mockInstance, key, value, callback) {

  value = parseInt(value, 10);

  if (!mockInstance.storage[key]) {
    const number = value;
    exports.set(mockInstance, key, number);
    mockInstance._callCallback(callback, null, number);

  } else if (mockInstance.storage[key].type !== "string") {
    const err = new Error("WRONGTYPE Operation against a key holding the wrong kind of value");
    mockInstance._callCallback(callback, err, null);

  } else if (_isInteger(mockInstance.storage[key].value)) {
    const number = parseInt(mockInstance.storage[key].value, 10) + value;
    mockInstance.storage[key].value = number.toString();
    mockInstance._callCallback(callback, null, number);

  } else {
    const err = new Error("ERR value is not an integer or out of range");
    mockInstance._callCallback(callback, err, null);
  }
}

/**
 * Incrbyfloat
 */
exports.incrbyfloat = function (mockInstance, key, value, callback) {

  if (!mockInstance.storage[key]) {
    const number = parseFloat(value);
    exports.set(mockInstance, key, number.toString());
    mockInstance._callCallback(callback, null, number.toString());

  } else if (mockInstance.storage[key].type !== "string") {
    const err = new Error("WRONGTYPE Operation against a key holding the wrong kind of value");
    mockInstance._callCallback(callback, err, null);

  } else if (_isFloat(mockInstance.storage[key].value) && _isFloat(value)) {
    const number = parseFloat(mockInstance.storage[key].value) + parseFloat(value);
    mockInstance.storage[key].value = number.toString();
    mockInstance._callCallback(callback, null, number.toString());

  } else {
    const err = new Error("ERR value is not a valid float");
    mockInstance._callCallback(callback, err, null);
  }
}

/**
 * Decr
 */
exports.decr = function (mockInstance, key, callback) {

  if (!mockInstance.storage[key]) {
    const number = -1;
    exports.set(mockInstance, key, number);
    mockInstance._callCallback(callback, null, number);

  } else if (mockInstance.storage[key].type !== "string") {
    const err = new Error("WRONGTYPE Operation against a key holding the wrong kind of value");
    mockInstance._callCallback(callback, err, null);

  } else if (_isInteger(mockInstance.storage[key].value)) {
    const number = parseInt(mockInstance.storage[key].value, 10) - 1;
    mockInstance.storage[key].value = number.toString();
    mockInstance._callCallback(callback, null, number);

  } else {
    const err = new Error("ERR value is not an integer or out of range");
    mockInstance._callCallback(callback, err, null);
  }
}

/**
 * Decrby
 */
exports.decrby = function (mockInstance, key, value, callback) {

  value = parseInt(value, 10);

  if (!mockInstance.storage[key]) {
    const number = 0 - value;
    exports.set(mockInstance, key, number);
    mockInstance._callCallback(callback, null, number);

  } else if (mockInstance.storage[key].type !== "string") {
    const err = new Error("WRONGTYPE Operation against a key holding the wrong kind of value");
    mockInstance._callCallback(callback, err, null);

  } else if (_isInteger(mockInstance.storage[key].value)) {
    const number = parseInt(mockInstance.storage[key].value, 10) - value;
    mockInstance.storage[key].value = number.toString();
    mockInstance._callCallback(callback, null, number);

  } else {
    const err = new Error("ERR value is not an integer or out of range");
    mockInstance._callCallback(callback, err, null);
  }
}
