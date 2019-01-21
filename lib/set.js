var Item = require('./item.js');
var shuffle = require('./helpers.js').shuffle;

/**
 * Sadd
 */
exports.sadd = function (mockInstance, key) {
  // We require at least 3 arguments
  // 0: mockInstance
  // 1: set name
  // 2: members to add
  if (arguments.length <= 3) {
    return;
  }

  var callback = null;
  var membersToAdd = [];

  for (var i = 2; i < arguments.length; i++) {
    // Argument is not callback
    if ('function' !== typeof arguments[i]) {
      membersToAdd.push(arguments[i]);
    } else {
      callback = arguments[i];
      break;
    }
  }

  if (mockInstance.storage[key] && mockInstance.storage[key].type !== 'set') {
    var err = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    return mockInstance._callCallback(callback, err);
  }

  mockInstance.storage[key] = mockInstance.storage[key] || Item.createSet();

  var set = mockInstance.storage[key].value;
  var addCount = 0;
  for (var j = 0; j < membersToAdd.length; j++) {
    if (set.indexOf(Item._stringify(membersToAdd[j])) < 0) {
      set.push(Item._stringify(membersToAdd[j]));
      addCount++;
    }
  }

  mockInstance._callCallback(callback, null, addCount);
}

/**
 * Srem
 */
exports.srem = function (mockInstance, key) {
  // We require at least 3 arguments
  // 0: mockInstance
  // 1: set name
  // 2: members to remove
  if (arguments.length <= 3) {
    return;
  }

  var callback = null;
  var membersToRemove = [];

  for (var i = 2; i < arguments.length; i++) {
    // Argument is not callback
    if ('function' !== typeof arguments[i]) {
      membersToRemove.push(arguments[i]);
    } else {
      callback = arguments[i];
      break;
    }
  }

  var remCount = 0;

  if (mockInstance.storage[key]) {
    if (mockInstance.storage[key].type !== 'set') {
      var err = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
      return mockInstance._callCallback(callback, err);
    }

    var set = mockInstance.storage[key].value;

    for (var j = 0; j < membersToRemove.length; j++) {
      for (var k = 0; k < set.length; k++) {
        if (set[k] === Item._stringify(membersToRemove[j])) {
          set.splice(k, 1);
          remCount++;
        }
      }
    }
  }

  mockInstance._callCallback(callback, null, remCount);
}

/**
 * Smembers
 */
exports.smembers = function (mockInstance, key, callback) {
  var members = [];

  if (mockInstance.storage[key]) {
    if (mockInstance.storage[key].type !== 'set') {
      var err = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
      return mockInstance._callCallback(callback, err);
    } else {
      members = mockInstance.storage[key].value;
    }
  }

  mockInstance._callCallback(callback, null, members);
}

/**
 * Sismember
 */
exports.sismember = function (mockInstance, key, member, callback) {
  if (mockInstance.storage[key]) {
    if (mockInstance.storage[key].type !== 'set') {
      var err = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
      return mockInstance._callCallback(callback, err);
    }
  }
  member = Item._stringify(member);
  var count = (mockInstance.storage[key] && (mockInstance.storage[key].value.indexOf(member) > -1)) ? 1 : 0;
  mockInstance._callCallback(callback, null, count);
}

/**
 * Scard
 */
exports.scard = function (mockInstance, key, callback) {
  var count = 0;

  if (mockInstance.storage[key]) {
    if (mockInstance.storage[key].type !== 'set') {
      var err = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
      return mockInstance._callCallback(callback, err);
    } else {
      var set = mockInstance.storage[key].value;
      count = set.length;
    }
  }

  mockInstance._callCallback(callback, null, count);
}

/**
 * Sadd
 */
exports.smove = function (mockInstance, source, destination, member, callback) {
  if (mockInstance.storage[source] && mockInstance.storage[source].type !== 'set') {
    var err = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    return mockInstance._callCallback(callback, err);
  }

  if (mockInstance.storage[destination] && mockInstance.storage[destination].type !== 'set') {
    err = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    return mockInstance._callCallback(callback, err);
  }

  mockInstance.storage[source] = mockInstance.storage[source] || Item.createSet();
  mockInstance.storage[destination] = mockInstance.storage[destination] || Item.createSet();

  var set = mockInstance.storage[source].value;
  if (set.indexOf(Item._stringify(member)) < 0) {
    return mockInstance._callCallback(callback, null, 0);
  }

  for (var j = 0; j < set.length; j++) {
    if (set[j] === Item._stringify(member)) {
      set.splice(j, 1);
    }
  }

  set = mockInstance.storage[destination].value;
  if (set.indexOf(Item._stringify(member)) < 0) {
    set.push(Item._stringify(member));
  }

  mockInstance._callCallback(callback, null, 1);
}

/**
 * Srandmember
 */
exports.srandmember = function (mockInstance, key, count, callback) {
  if (typeof count === 'function') {
    callback = count;
    count = null;
  }

  if (mockInstance.storage[key] && mockInstance.storage[key].type !== 'set') {
    var err = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    return mockInstance._callCallback(callback, err);
  }

  if (count !== null && (typeof count !== 'number' || count < 0)) {
    err = new Error('ERR value is not an integer or out of range');
    return mockInstance._callCallback(callback, err);
  }

  if (!mockInstance.storage[key]) {
    if (count === null) {
      return mockInstance._callCallback(callback, null, null);
    } else {
      return mockInstance._callCallback(callback, null, []);
    }
  }

  var members = mockInstance.storage[key].value;
  var result;

  if (count !== null) {
    var shuffled = shuffle(members);
    result = shuffled.slice(0, count);
  } else {
    result = members[Math.floor(Math.random() * members.length)];
  }

  mockInstance._callCallback(callback, null, result);
}
