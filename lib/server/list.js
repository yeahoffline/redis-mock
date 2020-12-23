const helpers = require("../helpers.js");
const Item = require("./item.js");


const mockCallback = helpers.noOpCallback;

const validKeyType = function(mockInstance, key, callback) {
  return helpers.validKeyType(mockInstance, key, 'list', callback);
};

const initKey = function(mockInstance, key) {
  return helpers.initKey(mockInstance, key, Item.createList);
};

/**
 * Llen
 */
exports.llen = function (key, callback) {
  const length = this.storage[key] ? this.storage[key].value.length : 0;
  helpers.callCallback(callback, null, length);
};

const push = function (fn, args) {
  const len = args.length;
  if (len < 2) {
    return;
  }
  var mockInstance = args[0];
  var key = args[1];
  var callback = helpers.parseCallback(args);
  if (typeof callback === 'undefined') {
    callback = mockCallback;
  }
  if (!validKeyType(mockInstance, key, callback)) {
    return;
  }
  // init key
  initKey(mockInstance, key);

  // parse only the values from the args;
  var values = [];
  for (var i=2, val; i < len; i++) {
    val = args[i];
    if ('function' === typeof val) {
      break;
    }
    values.push(val);
  }
  fn.call(mockInstance.storage[key], values);
  var length = mockInstance.storage[key].value.length;
  pushListWatcher.pushed(key);
  helpers.callCallback(callback, null, length);
};

/**
 * Lpush
 */
exports.lpush = function (...args) {
  push(Item._list.prototype.lpush, [this].concat(args));
};

/**
 * Rpush
 */
exports.rpush = function (...args) {
  push(Item._list.prototype.rpush, [this].concat(args));
};

const pushx = function (fn, mockInstance, key, value, callback) {
  var length = 0;
  if (mockInstance.storage[key]) {
    if (mockInstance.storage[key].type !== "list") {
      return helpers.callCallback(callback,
        new Error("ERR Operation against a key holding the wrong kind of value"));
    }
    fn.call(mockInstance.storage[key], [value]);
    length = mockInstance.storage[key].value.length;
    pushListWatcher.pushed(key);
  }
  helpers.callCallback(callback, null, length);
};

/**
 * Rpushx
 */
exports.rpushx = function (key, value, callback) {
  pushx(Item._list.prototype.rpush, this, key, value, callback);
};

/**
 * Lpushx
 */
exports.lpushx = function (key, value, callback) {
  pushx(Item._list.prototype.lpush, this, key, value, callback);
};

const pop = function (fn, mockInstance, key, callback) {
  var val = null;
  if (mockInstance.storage[key] && mockInstance.storage[key].type !== "list") {
    return helpers.callCallback(callback,
      new Error("ERR Operation against a key holding the wrong kind of value"));
  }
  if (mockInstance.storage[key] && mockInstance.storage[key].value.length > 0) {
    val = fn.call(mockInstance.storage[key]);
  }
  helpers.callCallback(callback, null, val);
};

/**
 * Lpop
 */
exports.lpop = function (key, callback) {
  pop.call(this, Item._list.prototype.lpop, this, key, callback);
};

/**
 * Rpop
 */
exports.rpop = function (key, callback) {
  pop.call(this, Item._list.prototype.rpop, this, key, callback);
};

/**
 * Rpoplpush
 */
exports.rpoplpush = function(sourceKey, destinationKey, callback) {
  pop.call(this, Item._list.prototype.rpop, this, sourceKey, (err, reply) => {
    if (err) {
      return helpers.callCallback(callback, err, null);
    }
    if (reply === null || reply === undefined) {
      return helpers.callCallback(callback, null);
    }
    push(Item._list.prototype.lpush, [
      this,
      destinationKey,
      reply,
      (err) => {
        if (err) {
          return helpers.callCallback(callback, err, null);
        }
        return helpers.callCallback(callback, null, reply);
      }
    ]);
  });
};

/**
 * Listen to all the list identified by keys and set a timeout if timeout != 0
 */
const listenToPushOnLists = function (mockInstance, keys, timeout, callback) {
  var listenedTo = [];
  var expire = null;
  var listener = (key) => {
    // We remove all the other listeners.
    pushListWatcher.removeListeners(listenedTo, listener);
    if (expire) {
      clearTimeout(expire);
    }
    callback(key);
  };

  for (var i = 0; i < keys.length; i++) {
    listenedTo.push(keys[i]);
    pushListWatcher.suscribe(keys[i], listener);
  }
  if (timeout > 0) {
    expire = setTimeout(function () {
      pushListWatcher.removeListeners(listenedTo, listener);
      callback(null);
    }, timeout * 1000);
    if (expire.unref) {
      expire.unref();
    }
  }
};

/**
 * Helper function to build blpop and brpop
 */
const bpop = function (fn, mockInstance, keys, timeout, callback) {
  var val = null;
  // Look if any element can be returned
  for (var i = 0; i < keys.length; i++) {
    if (mockInstance.storage[keys[i]] && mockInstance.storage[keys[i]].value.length > 0) {
      var key = keys[i];
      val = fn.call(mockInstance.storage[key]);
      helpers.callCallback(callback, null, [key, val]);
      return;
    }
  }
  // We listen to all the list we asked for
  listenToPushOnLists(mockInstance, keys, timeout, (key) => {
    if (key !== null) {
      val = fn.call(mockInstance.storage[key]);
      helpers.callCallback(callback, null, [key, val]);
    } else {
      helpers.callCallback(callback, null, null);
    }

  });
};

/**
 * BLpop
 */
exports.blpop = function (keys, timeout, callback) {
  bpop.call(this, Item._list.prototype.lpop, this, keys, timeout, callback);
};

/**
 * BRpop
 */
exports.brpop = function (keys, timeout, callback) {
  bpop.call(this, Item._list.prototype.rpop, this, keys, timeout, callback);
};

/**
 * Lindex
 */
exports.lindex = function (key, index, callback) {
  let val = null;
  if (this.storage[key]) {
    if (this.storage[key].type !== "list") {
      return helpers.callCallback(callback,
        new Error("ERR Operation against a key holding the wrong kind of value"));
    }

    if (index < 0 && -this.storage[key].value.length <= index) {
      val = this.storage[key].value[this.storage[key].value.length + index];
    } else if (this.storage[key].value.length > index) {
      val = this.storage[key].value[index];
    }
  }
  helpers.callCallback(callback, null, val);
};

/**
 * Lrange
 */
exports.lrange = function (key, startIndex, stopIndex, callback) {
  var val = [];
  var index1 = startIndex;
  var index2 = stopIndex;

  if (this.storage[key]) {
    if (this.storage[key].type !== "list") {
      return helpers.callCallback(callback,
        new Error("ERR Operation against a key holding the wrong kind of value"));
    }

    index1 = index1 >= 0 ? index1 : Math.max(this.storage[key].value.length + index1, 0);
    index2 = index2 >= 0 ? index2 : Math.max(this.storage[key].value.length + index2, 0);
    val = this.storage[key].value.slice(index1, index2 + 1);
  }
  helpers.callCallback(callback, null, val);
};

/**
 * Lrem
 */
exports.lrem = function (key, count, value, callback) {
  var removedCount = 0;

  if (this.storage[key]) {
    if (this.storage[key].type !== "list") {
      return helpers.callCallback(callback,
        new Error("ERR Operation against a key holding the wrong kind of value"));
    }

    var list = this.storage[key].value;

    var strValue = Item._stringify(value);

    var filteredList = [];
    if (count > 0) {
      // count > 0: Remove elements equal to value moving from head to tail
      for (var i = 0; i < list.length; ++i) {
        if (list[i] === strValue && count > 0) {
          --count;
          ++removedCount;
        } else {
          filteredList.push(list[i]);
        }
      }
    } else if (count < 0) {
      // count < 0: Remove elements equal to value moving from tail to head.
      for (i = list.length; i > 0; --i) {
        if (list[i-1] === strValue && count < 0) {
          ++count;
          ++removedCount;
        } else {
          filteredList.unshift(list[i-1]);
        }
      }
    } else {
      // count = 0: Remove all elements equal to value.
      for (i = 0; i < list.length; ++i) {
        if (list[i] === strValue) {
          ++removedCount;
        } else {
          filteredList.push(list[i]);
        }
      }
    }

    this.storage[key].value = filteredList;
  }
  helpers.callCallback(callback, null, removedCount);
};

/**
 * Lset
 */
exports.lset = function (key, index, value, callback) {
  var res = "OK";
  var len = -1;
  if (!this.storage[key]) {
    return helpers.callCallback(callback,
      new Error("ERR no such key"));
  }
  if (this.storage[key].type !== "list") {
    return helpers.callCallback(callback,
      new Error("ERR Operation against a key holding the wrong kind of value"));
  }
  len = this.storage[key].value.length;
  if (len <= index || -len > index) {
    return helpers.callCallback(callback,
      new Error("ERR index out of range"));
  }
  if (index < 0) {
    this.storage[key].value[len + index] = Item._stringify(value);
  } else {
    this.storage[key].value[index] = Item._stringify(value);
  }
  helpers.callCallback(callback, null, res);
};

/**
 * ltrim
 */
exports.ltrim = function(key, start, end, callback) {
	var res = "OK";
	var len = -1;
	if (!this.storage[key]) {
		return helpers.callCallback(callback, null, res);
	}

	if (this.storage[key].type !== "list") {
    return helpers.callCallback(callback,
      new Error("WRONGTYPE Operation against a key holding the wrong kind of value"));
  }

  len = this.storage[key].value.length;

  if (start < 0) {
    start = len + start;
  }
  if (end < 0) {
    end = len + end;
  }
  if (end >= len) {
    end = len - 1;
  }
  if (start >= len || start > end) {
    // trim whole list
    delete this.storage[key];
  } else {
    this.storage[key].value = this.storage[key].value.slice(start, end + 1);
  }
  helpers.callCallback(callback, null, res);
};

/**
 * Used to follow a list depending on its key (used by blpop and brpop mainly)
 */
const PushListWatcher = function () {
  this.listeners = {};
};

/**
 * Watch for the next push in the list key
 */
PushListWatcher.prototype.suscribe = function (key, listener) {
  if (this.listeners[key]) {
    this.listeners[key].push(listener);
  } else {
    this.listeners[key] = [listener];
  }
};

/**
 * Calls the first listener which was waiting for an element
 * to call when we push to a list
 */
PushListWatcher.prototype.pushed = function (key) {
  if (this.listeners[key] && this.listeners[key].length > 0) {
    var listener = this.listeners[key].shift();
    listener(key);
  }
};

/**
 * Remove all the listener from all the keys it was listening to
 */
PushListWatcher.prototype.removeListeners = function (listenedTo, listener) {
  for (var i = 0; i < listenedTo.length; i++) {
    for (var j = 0; j < this.listeners[listenedTo[i]].length; j++) {
      if (this.listeners[listenedTo[i]][j] === listener) {
        this.listeners[listenedTo[i]].splice(j, 1);
        j = this.listeners[listenedTo[i]];
      }
    }
  }
};

const pushListWatcher = new PushListWatcher();
