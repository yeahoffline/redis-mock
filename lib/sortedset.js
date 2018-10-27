/* eslint complexity: "off", no-continue: "off" */

var helpers = require("./helpers.js");
var Item = require("./item.js");

/**

  *** NOT IMPLEMENTED ***

  ZLEXCOUNT key min max
  Count the number of members in a sorted set between a given lexicographical range

  ZRANGEBYLEX key min max [LIMIT offset count]
  Return a range of members in a sorted set, by lexicographical range

  ZREVRANGEBYLEX key max min [LIMIT offset count]
  Return a range of members in a sorted set, by lexicographical range, ordered from higher to lower strings.

  ZREMRANGEBYLEX key min max
  Remove all members in a sorted set between the given lexicographical range

  ZUNIONSTORE destination numkeys key [key ...] [WEIGHTS weight [weight ...]] [AGGREGATE SUM|MIN|MAX]
  Add multiple sorted sets and store the resulting sorted set in a new key

  ZSCAN key cursor [MATCH pattern] [COUNT count]
  Incrementally iterate sorted sets elements and associated scores


  Also: ZUNIONSTORE / ZINTERSTORE is only partially implemented.

*/

var MAX_SCORE_VALUE = 9007199254740992;
var MIN_SCORE_VALUE = -MAX_SCORE_VALUE;

var mockCallback = helpers.mockCallback;

var validKeyType = function(mockInstance, key, callback) {
  return helpers.validKeyType(mockInstance, key, 'zset', callback)
}

var initKey = function(mockInstance, key) {
  return helpers.initKey(mockInstance, key, Item.createSortedSet);
}

// delimiter for lexicographically sorting by score & member
var rankedDelimiter = '#';

/*
Returns a sorted set of all the score+members for a key
*/
var getRankedList = function(mockInstance, key) {
  // returns a ranked list of items (k)
  var items = [];
  for (var member in mockInstance.storage[key].value) {
    var score = parseFloat(mockInstance.storage[key].value[member]);
    items.push([score, score + rankedDelimiter + member]);
  }

  //first sort by score then alphabetically
  items.sort(
    function (a, b) {
      return a[0] - b[0] || a[1].localeCompare(b[1]);
    });

  //return the concatinated values
  return items.map(function (value, index) {
    return value[1];
  });
}

/*
getRank (zrank & zrevrank)
*/
var getRank = function(mockInstance, key, member, callback, reversed) {

 var len = arguments.length;
  if (len <= 3) {
    return
  }
  if (callback == undefined) {
    callback = mockCallback;
  }
  if (!validKeyType(mockInstance, key, callback)) {
    return
  }
  initKey(mockInstance, key);
  member = Item._stringify(member);
  var rank = null;
  var ranked = getRankedList(mockInstance, key);

  // this is for zrevrank
  if (reversed) {
    ranked.reverse();
  }

  for (var i=0, parts, s, m; i < ranked.length; i++) {
    parts = ranked[i].split(rankedDelimiter);
    s = parts[0];
    m = parts.slice(1).join(rankedDelimiter);
    if (m === member) {
      rank = i;
      break;
    }
  }
  mockInstance._callCallback(callback, null, rank);

}

/*
getRange (zrange & zrevrange)
*/
var getRange = function(mockInstance, key, start, stop, withscores, callback, reversed) {
  var len = arguments.length;
  if (len < 4) {
    return
  }
  if ('function' === typeof withscores) {
    callback = withscores;
    withscores = undefined;
  }
  if (callback == undefined) {
    callback = mockCallback;
  }
  if (!validKeyType(mockInstance, key, callback)) {
    return
  }

  initKey(mockInstance, key);
  var ranked = getRankedList(mockInstance, key);

  // this is for zrevrange
  if (reversed) {
    ranked.reverse();
  }

  // convert to string so we can test for inclusive range
  start = parseInt(String(start), 10);
  stop = parseInt(String(stop), 10);

  if (start < 0) {
    start = ranked.length + start;
  }
  if (stop < 0) {
    stop = ranked.length + stop;
  }

  // start must be less then stop
  if (start > stop) {
    return mockInstance._callCallback(callback, null, []);
  }
  // console.log(ranked, start, stop + 1);

  // make slice inclusive
  ranked = ranked.slice(start, stop + 1);

  var range = [],
      mintest,
      maxtest;
  for (var i=0, parts, s, score, m; i < ranked.length; i++) {
    parts = ranked[i].split(rankedDelimiter);
    s = parts[0];
    score = parseFloat(s);
    m = parts.slice(1).join(rankedDelimiter);
    range.push(m);
    if (withscores && withscores.toLowerCase() === 'withscores') {
      range.push(s);
    }
  }
  mockInstance._callCallback(callback, null, range);
}

/**
getRangeByScore (zrangebyscore & zrevrangebyscore)
**/
var getRangeByScore = function(
  mockInstance,
  key,
  min,
  max,
  withscores,
  limit,
  offset,
  count,
  callback,
  reversed) {

  var len = arguments.length;
  if (len < 4) {
    return
  }
  if ('function' === typeof withscores) {
    callback = withscores;
    withscores = undefined;
  }
  if ('function' === typeof limit) {
    callback = limit;
    limit = undefined;
  }
  if (callback == undefined) {
    callback = mockCallback;
  }
  if (!validKeyType(mockInstance, key, callback)) {
    return
  }

  initKey(mockInstance, key);

  var ranked = getRankedList(mockInstance, key);
  if (reversed) {
    ranked.reverse();
  }

  // check for infinity flags
  if (min.toString() === '-inf') {
    min = MIN_SCORE_VALUE;
  }
  if (max.toString() === '+inf') {
    max = MAX_SCORE_VALUE;
  }
  // handles the reversed case
  if (min.toString() === '+inf') {
    min = MAX_SCORE_VALUE;
  }
  if (max.toString() === '-inf') {
    max = MIN_SCORE_VALUE;
  }

  // convert to string so we can test for inclusive range
  min = String(min);
  max = String(max);

  // ranges inclusive?
  var minlt = false;
  var maxlt = false;
  if (min[0] === '(') {
    min = min.substring(1);
    minlt = true;
  }
  if (max[0] === '(') {
    max = max.substring(1);
    maxlt = true;
  }
  // convert to float
  min = parseFloat(min);
  max = parseFloat(max);

  // console.log('checkpoint', ranked, min, max, withscores, callback, minlt, maxlt);
  var range = [],
      mintest,
      maxtest;
  for (var i=0, parts, s, score, m; i < ranked.length; i++) {
    parts = ranked[i].split(rankedDelimiter);
    s = parts[0];
    score = parseFloat(s);
    mintest = (minlt) ? (min < score) : (min <= score);
    maxtest = (maxlt) ? (score < max) : (score <= max);

    // console.log('test', s, score, mintest, maxtest);
    if (!mintest || !maxtest) {
      continue;
    }
    m = parts.slice(1).join(rankedDelimiter);
    range.push(m);
    if (withscores && withscores.toLowerCase() === 'withscores') {
      // score as string
      range.push(s);
    }
  }
  // console.log('range', range);
  // do we need to slice the out put?
  if (limit && limit.toLowerCase() === 'limit' && offset && count) {
    offset = parseInt(offset, 10);
    count = parseInt(count, 10);
    // withscores needs to adjust the offset and count
    if (withscores && withscores.toLowerCase() === 'withscores') {
      offset *= 2;
      count *= 2;
    }
    range = range.slice(offset, offset + count);
  }

  mockInstance._callCallback(callback, null, range);

}

// ZADD key [NX|XX] [CH] [INCR] score member [score member ...]
// Add one or more members to a sorted set, or update its score if it already exists
exports.zadd = function(mockInstance, key) {

  var len = arguments.length;
  if (len <= 3) {
    return
  }
  var callback = helpers.parseCallback(arguments);
  if (!validKeyType(mockInstance, key, callback)) {
    return
  }
  // init key
  initKey(mockInstance, key);

  // declare opts
  var nx = false,
      xx = false,
      ch = false,
      incr = false;
  var start = 2,
      count = 0;

  for (var i=start; i < len; i++) {
    var opt = arguments[i];
    opt = opt.toString().toLowerCase();
    // Don't update already existing elements. Always add new elements.
    if (opt === 'nx') {
      nx = true;
      continue;
    }
    // Only update elements that already exist. Never add elements.
    if (opt === 'xx') {
      xx = true;
      continue;
    }
    // Total number of elements changed
    if (opt === 'ch') {
      ch = true;
      continue;
    }
    if (opt === 'incr') {
      incr = true;
      continue;
    }
    start = i;
    break;

  }

  for (i = start; i < len; i += 2) {
    // hold the score and make sure it isn't an opt
    var score = arguments[i];

    // did we reach the end?
    if (len <= (i + 1)) {
        break;
    }
    var member = Item._stringify(arguments[i + 1]);
    var existingScore = mockInstance.storage[key].value[member];
    var exists = existingScore != undefined;

    // process opts
    if ((nx && exists) || (xx && !exists)) {
      continue;
    }
    // convert score to string
    score = score.toString();

    // updating score if memeber doesn't exist
    // or if ch = true and score changes
    if (!exists || (ch && existingScore != score)) {
      count += 1;
    }

    // do we need to incr (existing score + score)?
    if (incr && existingScore) {
      score = parseFloat(existingScore) + parseFloat(score);
      score = String(score);
    }

    // update score
    mockInstance.storage[key].value[member] = score;

    // only one member is allowed update
    // if we have an incr
    // this shold behave the same as zincrby
    // so return the score instead of the updatedCount;
    if (incr) {
      count = score;
      break;
    }
  }

  if (callback) {
    mockInstance._callCallback(callback, null, count);
  }
}

// ZCARD key
// Get the number of members in a sorted set
exports.zcard = function(mockInstance, key, callback) {
  var len = arguments.length;
  if (len < 1) {
    return
  }
  if (callback == undefined) {
    callback = mockCallback;
  }
  if (!validKeyType(mockInstance, key, callback)) {
    return
  }
  initKey(mockInstance, key);
  var count = Object.keys(mockInstance.storage[key].value).length;
  mockInstance._callCallback(callback, null, count);
}

// ZCOUNT key min max
// Count the members in a sorted set with scores within the given values
exports.zcount = function(mockInstance, key, min, max, callback) {
  var parse = function(err, result) {
    if (err) {
      return mockInstance._callCallback(callback, err);
    }
    mockInstance._callCallback(callback, null, result.length);
  }
  exports.zrangebyscore(mockInstance, key, min, max, parse);
}

// ZINCRBY key increment member
// Increment the score of a member in a sorted set
exports.zincrby = function(mockInstance, key, increment, member, callback) {
  var len = arguments.length;
  if (len < 4) {
    return
  }
  if (callback == undefined) {
    callback = mockCallback;
  }
  if (!validKeyType(mockInstance, key, callback)) {
    return
  }
  initKey(mockInstance, key);
  member = Item._stringify(member);
  var s = mockInstance.storage[key].value[member];
  var score = parseFloat( s !== undefined ? s : '0');
  increment = parseFloat(String(increment));
  score += increment;
  score = String(score);
  mockInstance.storage[key].value[member] = score;
  mockInstance._callCallback(callback, null, score);
}

// ZRANGE key start stop [WITHSCORES]
// Return a range of members in a sorted set, by index
exports.zrange = function(mockInstance, key, start, stop, withscores, callback) {
  getRange(mockInstance, key, start, stop, withscores, callback, false);
}

// ZRANGEBYSCORE key min max [WITHSCORES] [LIMIT offset count]
// Return a range of members in a sorted set, by score
exports.zrangebyscore = function(
  mockInstance,
  key,
  min,
  max,
  withscores,
  limit,
  offset,
  count,
  callback) {

  getRangeByScore(
    mockInstance,
    key,
    min,
    max,
    withscores,
    limit,
    offset,
    count,
    callback,
    false);

};

// ZRANK key member
// Determine the index of a member in a sorted set
exports.zrank = function(mockInstance, key, member, callback) {
  getRank(mockInstance, key, member, callback, false);
}

// ZREM key member [member ...]
// Remove one or more members from a sorted set
exports.zrem = function(mockInstance, key) {
  var len = arguments.length;
  if (len <= 3) {
    return
  }

  var callback = helpers.parseCallback(arguments);
  if (callback == undefined) {
    callback = mockCallback;
  }
  if (!validKeyType(mockInstance, key, callback)) {
    return
  }
  initKey(mockInstance, key);
  // The number of members removed from the sorted set,
  // not including non existing members.
  var count = 0;
  for (var i=2, member; i < len; i++) {
    member = arguments[i];
    if ('function' == typeof member) {
      break;
    }
    member = Item._stringify(member);
    if (mockInstance.storage[key].value[member]) {
      delete mockInstance.storage[key].value[member];
      count += 1;
    }
  }
  mockInstance._callCallback(callback, null, count);
}

// ZREMRANGEBYRANK key start stop
// Remove all members in a sorted set within the given indexes
exports.zremrangebyrank = function(mockInstance, key, start, stop, callback) {

  var deleteResults = function(err, results) {
    if (err) {
      return mockInstance._callCallback(callback, err);
    }
    var count = 0;
    for (var i=0, member; i < results.length; i++) {
      member = results[i];
      if (mockInstance.storage[key].value[member]) {
        delete mockInstance.storage[key].value[member];
        count += 1;
      }
    }
    mockInstance._callCallback(callback, null, count);
  }
  getRange(mockInstance, key, start, stop, deleteResults, false);
}

// ZREMRANGEBYSCORE key min max
// Remove all members in a sorted set within the given scores
exports.zremrangebyscore = function(mockInstance, key, min, max, callback) {

  var deleteResults = function(err, results) {
    if (err) {
      return mockInstance._callCallback(callback, err);
    }
    var count = 0;
    for (var i=0, member; i < results.length; i++) {
      member = results[i];
      if (mockInstance.storage[key].value[member]) {
        delete mockInstance.storage[key].value[member];
        count += 1;
      }
    }
    mockInstance._callCallback(callback, null, count);
  }
  getRangeByScore(mockInstance, key, min, max, deleteResults, false);
}


// ZREVRANGE key start stop [WITHSCORES]
// Return a range of members in a sorted set, by index, with scores ordered from high to low
exports.zrevrange = function(mockInstance, key, start, stop, withscores, callback) {
  getRange(mockInstance, key, start, stop, withscores, callback, true);
}

// ZREVRANGEBYSCORE key max min [WITHSCORES] [LIMIT offset count]
// Return a range of members in a sorted set, by score, with scores ordered from high to low
exports.zrevrangebyscore = function(
  mockInstance,
  key,
  max,
  min,
  withscores,
  limit,
  offset,
  count,
  callback) {

  getRangeByScore(
    mockInstance,
    key,
    min,
    max,
    withscores,
    limit,
    offset,
    count,
    callback,
    true);
};

// ZREVRANK key member
// Determine the index of a member in a sorted set, with scores ordered from high to low
exports.zrevrank = function(mockInstance, key, member, callback) {
  getRank(mockInstance, key, member, callback, true);
}

// ZSCORE key member
// Get the score associated with the given member in a sorted set
exports.zscore = function(mockInstance, key, member, callback) {
  var len = arguments.length;
  if (len < 3) {
    return
  }
  if (callback == undefined) {
    callback = mockCallback;
  }
  if (!validKeyType(mockInstance, key, callback)) {
    return
  }
  initKey(mockInstance, key);
  var score = mockInstance.storage[key].value[Item._stringify(member)];
  mockInstance._callCallback(callback, null, (score === undefined ? null : score));
}

// ZUNIONSTORE key argcount member, members...
exports.zunionstore = function(mockInstance, destination, numKeys) {
  if (arguments.length < 3) {
    return
  }

  // Callback function (last arg)
  var c = arguments[arguments.length - 1]
  var callback = typeof c === 'function' && c || mockCallback

  // Parse arguments
  var argsArr = Array.prototype.slice.call(arguments).slice(1)
  var srcKeys = argsArr.slice(2, 2 + Number(numKeys))

  // Print out warning if bad keys were passed in
  if (srcKeys.length === 0) {
    console.warn('Warning: No keys passed in to ZUNIONSTORE') // eslint-disable-line no-console
  }
  if(srcKeys.some( function(key) {
    return !key
  })) {
    console.warn('Warning: Undefined or null key(s) provided to ZUNIONSTORE:', srcKeys) // eslint-disable-line no-console
  }

  var sourcesProcessed = 0
  srcKeys.forEach( function(srcKey) {
    getRange( mockInstance, srcKey, 0, -1, 'withscores', function(err, srcVals) {
      var srcItemsProcessed = 0

      // Did we select an empty source?
      if (!srcVals || srcVals.length === 0) {
        sourcesProcessed++
        // Done with all sources?
        if (sourcesProcessed === srcKeys.length) {
          initKey(mockInstance, destination);
          mockInstance._callCallback(callback, null, Object.keys(mockInstance.storage[destination].value).length)
          return;
        }
      }

      // Add items one-by-one (because value / score order is flipped on zadd vs. zrange)
      for(var i = 0; i < (srcVals.length -1); i = i+2) {
        //                                              score         member
        module.exports.zadd( mockInstance, destination, srcVals[i+1], srcVals[i])
        srcItemsProcessed++

        // Done with all items in this source?
        if (srcItemsProcessed === srcVals.length / 2) {
          sourcesProcessed++
        }
        // Done with all sources?
        if (sourcesProcessed === srcKeys.length) {
          initKey(mockInstance, destination);
          mockInstance._callCallback(callback, null, Object.keys(mockInstance.storage[destination].value).length)
        }
      }
    })
  })

  // TODO: Support: [WEIGHTS weight [weight ...]]
  // TODO: Support: [AGGREGATE SUM|MIN|MAX]
}


/* Is the provided prop present in all provided objects? */
var allObjsHaveKey = function(prop, objs) {
  return objs.every( function(o) {
    return !!o[prop]
  })
}

/* Sum of the given prop, as found in all the given objects */
var sumPropInObjs = function(prop, objs) {
  return objs.reduce( function(sum, o) {
    return sum + Number(o[prop] || '0')
  }, 0)
}

// ZINTERSTORE key argcount member, members...
exports.zinterstore = function(mockInstance, destination, numKeys) {
  if (arguments.length < 3) {
    return
  }

  // Callback function (last arg)
  var c = arguments[arguments.length - 1]
  var callback = typeof c === 'function' && c || mockCallback

  // Parse arguments
  var argsArr = Array.prototype.slice.call(arguments).slice(1)
  var srcKeys = argsArr.slice(2, 2 + Number(numKeys))

  // Print out warning if bad keys were passed in
  if (srcKeys.length === 0) {
    console.warn('Warning: No keys passed in to ZUNIONSTORE') // eslint-disable-line no-console
  }
  if (srcKeys.some( function(key) {
    return !key
  })) {
    console.warn('Warning: Undefined or null key(s) provided to ZUNIONSTORE:', srcKeys) // eslint-disable-line no-console
  }

  // Destination storage
  var dest = {} // Key -> Score mapping

  // Source keys storage (filtering out non-existent ones)
  var sources = srcKeys.map( function(srcKey) {
    return mockInstance.storage[srcKey] ? mockInstance.storage[srcKey].value : null
  }).filter( function(src) {
    return !!src
  })

  // Compute intersection (inefficiently)
  sources.forEach( function(source) {
    Object.keys(source).forEach(function(key) {
      if (allObjsHaveKey(key, sources)) {
        dest[key] = String(sumPropInObjs(key, sources))
      }
    })
  })

  // Store results
  initKey(mockInstance, destination);
  var destValues = Object.keys(dest)
  destValues.forEach(function(value) {
    module.exports.zadd( mockInstance, destination, dest[value], value)
  })

  mockInstance._callCallback(callback, null, destValues.length)

  // TODO: Support: [WEIGHTS weight [weight ...]]
  // TODO: Support: [AGGREGATE SUM|MIN|MAX]
}
