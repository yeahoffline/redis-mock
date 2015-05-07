var Item = require("./item.js");

/**
 * Set
 */
exports.set = function (mockInstance, key, value, callback) {

  mockInstance.storage[key] = Item.createString(value);

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

  if (mockInstance.storage[key]) {
    if (mockInstance.storage[key].type !== "string") {
      err = new Error("WRONGTYPE Operation against a key holding the wrong kind of value");
    } else {
      value = mockInstance.storage[key].value;
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
  
    mockInstance.storage[key] = Item.createString(value);

    mockInstance._callCallback(callback, err, oldValue);
  });
};

exports.mget = function (mockInstance) {

  var keys = [];
  var err = null;

  // Build up the set of keys
  if ('object' == typeof arguments[1]) {
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
    if (mockInstance.storage[keys[j]]) {
      if (mockInstance.storage[keys[j]].type !== 'string') {
        err = new Error("ERR Operation against key " + keys[j] + " holding wrong kind of value");
      } else {
        values.push(mockInstance.storage[keys[j]].value);
      }
    } else {
      values.push(null);
    }
  }

  if ('function' === typeof arguments[arguments.length - 1]) {
    mockInstance._callCallback(arguments[arguments.length - 1], err, values);
  }

}

/**
 * Incr
 */
exports.incr = function (mockInstance, key, callback) {

  function _isInteger(s) {
    return parseInt(s, 10) == s;
  }

  if (!mockInstance.storage[key]) {
    var number = 0 + 1;
    exports.set(mockInstance, key, number);
    mockInstance._callCallback(callback, null, number);

  } else if (mockInstance.storage[key].type !== "string") {
    var err = new Error("WRONGTYPE Operation against a key holding the wrong kind of value");
    mockInstance._callCallback(callback, err, null);

  } else if (_isInteger(mockInstance.storage[key].value)) {
    var number = parseInt(mockInstance.storage[key].value, 10) + 1;
    exports.set(mockInstance, key, number);
    mockInstance._callCallback(callback, null, number);

  } else {
    var err = new Error("ERR value is not an integer or out of range");
    mockInstance._callCallback(callback, err, null);
  }
}

/**
 * Incrby
 */
exports.incrby = function (mockInstance, key, value, callback) {

  function _isInteger(s) {
    return parseInt(s, 10) == s;
  }

  value = parseInt(value);

  if (!mockInstance.storage[key]) {
    var number = 0 + value;
    exports.set(mockInstance, key, number);
    mockInstance._callCallback(callback, null, number);

  } else if (mockInstance.storage[key].type !== "string") {
    var err = new Error("WRONGTYPE Operation against a key holding the wrong kind of value");
    mockInstance._callCallback(callback, err, null);

  } else if (_isInteger(mockInstance.storage[key].value)) {
    var number = parseInt(mockInstance.storage[key].value, 10) + value;
    exports.set(mockInstance, key, number);
    mockInstance._callCallback(callback, null, number);

  } else {
    var err = new Error("ERR value is not an integer or out of range");
    mockInstance._callCallback(callback, err, null);
  }
}

/**
 * Incrbyfloat
 */
exports.incrbyfloat = function (mockInstance, key, value, callback) {

  function _isFloat(s) {
    return parseFloat(s, 10) == s;
  }

  if (!mockInstance.storage[key]) {
    var number = 0 + parseFloat(value, 10);
    exports.set(mockInstance, key, number.toString());
    mockInstance._callCallback(callback, null, number.toString());

  } else if (mockInstance.storage[key].type !== "string") {
    var err = new Error("WRONGTYPE Operation against a key holding the wrong kind of value");
    mockInstance._callCallback(callback, err, null);

  } else if (_isFloat(mockInstance.storage[key].value) && _isFloat(value)) {
    var number = parseFloat(mockInstance.storage[key].value, 10) + parseFloat(value, 10);
    exports.set(mockInstance, key, number.toString());
    mockInstance._callCallback(callback, null, number.toString());

  } else {
    var err = new Error("ERR value is not a valid float");
    mockInstance._callCallback(callback, err, null);
  }
}
