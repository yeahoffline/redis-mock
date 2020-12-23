const Item = require('./item.js');
const { RedisError } = require('../errors');
const helpers = require('../helpers');
/**
 * Sadd
 */
exports.sadd = function (key) {
  // We require at least 3 arguments
  // 0: set name
  // 1: members to add
  if (arguments.length <= 2) {
    return;
  }

  let callback = null;
  const membersToAdd = [];

  for (let i = 1; i < arguments.length; i++) {
    // Argument is not callback
    if ('function' !== typeof arguments[i]) {
      membersToAdd.push(arguments[i]);
    } else {
      callback = arguments[i];
      break;
    }
  }

  if (this.storage[key] && this.storage[key].type !== 'set') {
    const err = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    return helpers.callCallback(callback, err);
  }

  this.storage[key] = this.storage[key] || Item.createSet();

  const set = this.storage[key].value;
  let addCount = 0;
  for (let j = 0; j < membersToAdd.length; j++) {
    if (set.indexOf(Item._stringify(membersToAdd[j])) < 0) {
      set.push(Item._stringify(membersToAdd[j]));
      addCount++;
    }
  }

  helpers.callCallback(callback, null, addCount);
};

/**
 * Srem
 */
exports.srem = function (key) {
  // We require at least 3 arguments
  // 0: set name
  // 1: members to remove
  if (arguments.length <= 2) {
    return;
  }

  let callback = null;
  const membersToRemove = [];

  for (let i = 1; i < arguments.length; i++) {
    // Argument is not callback
    if ('function' !== typeof arguments[i]) {
      membersToRemove.push(arguments[i]);
    } else {
      callback = arguments[i];
      break;
    }
  }

  let remCount = 0;

  if (this.storage[key]) {
    if (this.storage[key].type !== 'set') {
      const err = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
      return helpers.callCallback(callback, err);
    }

    const set = this.storage[key].value;

    for (let j = 0; j < membersToRemove.length; j++) {
      for (let k = 0; k < set.length; k++) {
        if (set[k] === Item._stringify(membersToRemove[j])) {
          set.splice(k, 1);
          remCount++;
        }
      }
    }
  }

  helpers.callCallback(callback, null, remCount);
};

/**
 * Smembers
 */
exports.smembers = function (key, callback) {
  let members = [];

  if (this.storage[key]) {
    if (this.storage[key].type !== 'set') {
      const err = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
      return helpers.callCallback(callback, err);
    } else {
      members = this.storage[key].value.slice(0);
    }
  }

  helpers.callCallback(callback, null, members);
};

/**
 * Sismember
 */
exports.sismember = function (key, member, callback) {
  if (this.storage[key]) {
    if (this.storage[key].type !== 'set') {
      const err = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
      return helpers.callCallback(callback, err);
    }
  }
  member = Item._stringify(member);
  const count = (this.storage[key] && (this.storage[key].value.indexOf(member) > -1)) ? 1 : 0;
  helpers.callCallback(callback, null, count);
};

/**
 * Scard
 */
exports.scard = function (key, callback) {
  let count = 0;

  if (this.storage[key]) {
    if (this.storage[key].type !== 'set') {
      const err = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
      return helpers.callCallback(callback, err);
    } else {
      const set = this.storage[key].value;
      count = set.length;
    }
  }

  helpers.callCallback(callback, null, count);
};

/**
 * Sadd
 */
exports.smove = function (source, destination, member, callback) {
  if (this.storage[source] && this.storage[source].type !== 'set') {
    const err = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    return helpers.callCallback(callback, err);
  }

  if (this.storage[destination] && this.storage[destination].type !== 'set') {
    const err = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    return helpers.callCallback(callback, err);
  }

  this.storage[source] = this.storage[source] || Item.createSet();
  this.storage[destination] = this.storage[destination] || Item.createSet();

  let set = this.storage[source].value;
  if (set.indexOf(Item._stringify(member)) < 0) {
    return helpers.callCallback(callback, null, 0);
  }

  for (let j = 0; j < set.length; j++) {
    if (set[j] === Item._stringify(member)) {
      set.splice(j, 1);
    }
  }

  set = this.storage[destination].value;
  if (set.indexOf(Item._stringify(member)) < 0) {
    set.push(Item._stringify(member));
  }

  helpers.callCallback(callback, null, 1);
};

/**
 * Srandmember
 */
exports.srandmember = function (key, count, callback) {
  if (typeof count === 'function') {
    callback = count;
    count = null;
  }

  if (this.storage[key] && this.storage[key].type !== 'set') {
    const err = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    return helpers.callCallback(callback, err);
  }

  if (count !== null && (typeof count !== 'number' || count < 0)) {
    const err = new Error('ERR value is not an integer or out of range');
    return helpers.callCallback(callback, err);
  }

  if (!this.storage[key]) {
    if (count === null) {
      return helpers.callCallback(callback, null, null);
    } else {
      return helpers.callCallback(callback, null, []);
    }
  }

  const members = this.storage[key].value;
  let result;

  if (count !== null) {
    const shuffled = helpers.shuffle(members);
    result = shuffled.slice(0, count);
  } else {
    result = members[Math.floor(Math.random() * members.length)];
  }

  helpers.callCallback(callback, null, result);
};

/**
 * Sscan
 */
exports.sscan = function (key, index, pattern, count, callback) {
  const regex = helpers.patternToRegex(pattern || '*');
  const keyvals = [];
  let idx = 1;
  let resIdx = 0;
  count = count || 10;
  if (this.storage[key] && this.storage[key].type !== "set") {
    return helpers.callCallback(callback, new RedisError('WRONGTYPE', 'WRONGTYPE Operation against a key holding the wrong kind of value'));
  }
  if (this.storage[key]) {
    const set = this.storage[key].value;
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
  helpers.callCallback(callback, null, [resIdx.toString(), keyvals]);
};
