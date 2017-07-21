var Item = require('./item.js');

/**
 * Sadd
 */
exports.sadd = function (mockInstance, key, members, callback) {
  if (mockInstance.storage[key] && mockInstance.storage[key].type !== 'set') {
    var err = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    return mockInstance._callCallback(callback, err);
  }

  mockInstance.storage[key] = mockInstance.storage[key] || Item.createSet();

  var set = mockInstance.storage[key].value;
  var addCount = 0;
  for (var i = 0; i < members.length; i++) {
    if (set.indexOf(Item._stringify(members[i])) < 0) {
      set.push(Item._stringify(members[i]));
      addCount++;
    }
  }

  mockInstance._callCallback(callback, null, addCount);
}

/**
 * Srem
 */
exports.srem = function (mockInstance, key, members, callback) {
  var remCount = 0;

  if (mockInstance.storage[key]) {

    if (mockInstance.storage[key].type !== 'set') {
      var err = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
      return mockInstance._callCallback(callback, err);

    } else {
      var set = mockInstance.storage[key].value;
      for (var i = 0; i < members.length; i++) {
        for (var j = 0; j < set.length; j++) {
          if (set[j] == Item._stringify(members[i])) {
            set.splice(j, 1);
            remCount++;
          }
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
  var members = null;

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
  var count = (mockInstance.storage[key].value.indexOf(member) > -1) ? 1 : 0;
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
    var err = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    return mockInstance._callCallback(callback, err);
  }

  mockInstance.storage[source] = mockInstance.storage[source] || Item.createSet();
  mockInstance.storage[destination] = mockInstance.storage[destination] || Item.createSet();

  var set = mockInstance.storage[source].value;
  if (set.indexOf(Item._stringify(member)) < 0) {
    return mockInstance._callCallback(callback, null, 0);
  }

  for (var j = 0; j < set.length; j++) {
    if (set[j] == Item._stringify(member)) {
      set.splice(j, 1);
    }
  }

  set = mockInstance.storage[destination].value;
  if (set.indexOf(Item._stringify(member)) < 0) {
    set.push(Item._stringify(member));
  }

  mockInstance._callCallback(callback, null, 1);
}
