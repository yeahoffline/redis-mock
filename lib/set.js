const Item = require('./item.js');
const patternToRegex = require('./helpers').patternToRegex;
const shuffle = require('./helpers.js').shuffle;
const RedisError = require('./RedisError');
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

  let callback = null;
  const membersToAdd = [];

  for (let i = 2; i < arguments.length; i++) {
    // Argument is not callback
    if ('function' !== typeof arguments[i]) {
      membersToAdd.push(arguments[i]);
    } else {
      callback = arguments[i];
      break;
    }
  }

  if (mockInstance.storage[key] && mockInstance.storage[key].type !== 'set') {
    const err = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    return mockInstance._callCallback(callback, err);
  }

  mockInstance.storage[key] = mockInstance.storage[key] || Item.createSet();

  const set = mockInstance.storage[key].value;
  let addCount = 0;
  for (let j = 0; j < membersToAdd.length; j++) {
    if (set.indexOf(Item._stringify(membersToAdd[j])) < 0) {
      set.push(Item._stringify(membersToAdd[j]));
      addCount++;
    }
  }

  mockInstance._callCallback(callback, null, addCount);
};

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

  let callback = null;
  const membersToRemove = [];

  for (let i = 2; i < arguments.length; i++) {
    // Argument is not callback
    if ('function' !== typeof arguments[i]) {
      membersToRemove.push(arguments[i]);
    } else {
      callback = arguments[i];
      break;
    }
  }

  let remCount = 0;

  if (mockInstance.storage[key]) {
    if (mockInstance.storage[key].type !== 'set') {
      const err = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
      return mockInstance._callCallback(callback, err);
    }

    const set = mockInstance.storage[key].value;

    for (let j = 0; j < membersToRemove.length; j++) {
      for (let k = 0; k < set.length; k++) {
        if (set[k] === Item._stringify(membersToRemove[j])) {
          set.splice(k, 1);
          remCount++;
        }
      }
    }
  }

  mockInstance._callCallback(callback, null, remCount);
};

/**
 * Smembers
 */
exports.smembers = function (mockInstance, key, callback) {
  let members = [];

  if (mockInstance.storage[key]) {
    if (mockInstance.storage[key].type !== 'set') {
      var err = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
      return mockInstance._callCallback(callback, err);
    } else {
      members = mockInstance.storage[key].value.slice(0);
    }
  }

  mockInstance._callCallback(callback, null, members);
};

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
  const count = (mockInstance.storage[key] && (mockInstance.storage[key].value.indexOf(member) > -1)) ? 1 : 0;
  mockInstance._callCallback(callback, null, count);
};

/**
 * Scard
 */
exports.scard = function (mockInstance, key, callback) {
  let count = 0;

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
};

/**
 * Sadd
 */
exports.smove = function (mockInstance, source, destination, member, callback) {
  if (mockInstance.storage[source] && mockInstance.storage[source].type !== 'set') {
    const err = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    return mockInstance._callCallback(callback, err);
  }

  if (mockInstance.storage[destination] && mockInstance.storage[destination].type !== 'set') {
    const err = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    return mockInstance._callCallback(callback, err);
  }

  mockInstance.storage[source] = mockInstance.storage[source] || Item.createSet();
  mockInstance.storage[destination] = mockInstance.storage[destination] || Item.createSet();

  let set = mockInstance.storage[source].value;
  if (set.indexOf(Item._stringify(member)) < 0) {
    return mockInstance._callCallback(callback, null, 0);
  }

  for (let j = 0; j < set.length; j++) {
    if (set[j] === Item._stringify(member)) {
      set.splice(j, 1);
    }
  }

  set = mockInstance.storage[destination].value;
  if (set.indexOf(Item._stringify(member)) < 0) {
    set.push(Item._stringify(member));
  }

  mockInstance._callCallback(callback, null, 1);
};

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

  const members = mockInstance.storage[key].value;
  let result;

  if (count !== null) {
    var shuffled = shuffle(members);
    result = shuffled.slice(0, count);
  } else {
    result = members[Math.floor(Math.random() * members.length)];
  }

  mockInstance._callCallback(callback, null, result);
};

/**
 * Sscan
 */
exports.sscan = function (mockInstance, key, index, pattern, count, callback) {
  const regex = patternToRegex(pattern || '*');
  const keyvals = [];
  let idx = 1;
  let resIdx = 0;
  count = count || 10;
  if (mockInstance.storage[key] && mockInstance.storage[key].type !== "set") {
    return mockInstance._callCallback(callback, new RedisError('WRONGTYPE', 'WRONGTYPE Operation against a key holding the wrong kind of value'));
  }
  if (mockInstance.storage[key]) {
    const set = mockInstance.storage[key].value;
    for (let i = 0; i < set.length; i++) {
      const member = set[i];
      if (idx >= index && regex.test(member)) {
        keyvals.push(member);
        count--;
        if (count === 0) {
          resIdx = idx + 1;
          break;
        }
      }
      idx++;
    }
  }
  mockInstance._callCallback(callback, null, [resIdx.toString(), keyvals]);
};
