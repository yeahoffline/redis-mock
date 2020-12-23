/* eslint complexity: "off", no-continue: "off" */

const helpers = require("../helpers.js");
const Item = require("./item.js");

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

const MAX_SCORE_VALUE = 9007199254740992;
const MIN_SCORE_VALUE = -MAX_SCORE_VALUE;

const mockCallback = helpers.noOpCallback;

const validKeyType = (mockInstance, key, callback) => helpers.validKeyType(mockInstance, key, 'zset', callback);

const initKey = (mockInstance, key) => helpers.initKey(mockInstance, key, Item.createSortedSet);

// delimiter for lexicographically sorting by score & member
const rankedDelimiter = '#';

/*
Returns a sorted set of all the score+members for a key
*/
const getRankedList = function(mockInstance, key) {
  // returns a ranked list of items (k)
  const items = [];
  for (const member in mockInstance.storage[key].value) {
    const score = parseFloat(mockInstance.storage[key].value[member]);
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
};

/*
getRank (zrank & zrevrank)
*/
const getRank = function(mockInstance, key, member, callback, reversed) {

 var len = arguments.length;
  if (len <= 3) {
    return;
  }
  if (!callback) {
    callback = mockCallback;
  }
  if (!validKeyType(mockInstance, key, callback)) {
    return;
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
  helpers.callCallback(callback, null, rank);
};

/*
getRange (zrange & zrevrange)
*/
const getRange = function(mockInstance, key, start, stop, withscores, callback, reversed) {
  const len = arguments.length;
  if (len < 4) {
    return;
  }
  if ('function' === typeof withscores) {
    callback = withscores;
    withscores = undefined;
  }
  if (!callback) {
    callback = mockCallback;
  }
  if (!validKeyType(mockInstance, key, callback)) {
    return;
  }

  initKey(mockInstance, key);
  let ranked = getRankedList(mockInstance, key);

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
    return helpers.callCallback(callback, null, []);
  }
  // console.log(ranked, start, stop + 1);

  // make slice inclusive
  ranked = ranked.slice(start, stop + 1);

  const range = [];
  for (let i = 0, parts, s, score, m; i < ranked.length; i++) {
    parts = ranked[i].split(rankedDelimiter);
    s = parts[0];
    score = parseFloat(s);
    m = parts.slice(1).join(rankedDelimiter);
    range.push(m);
    if (withscores && withscores.toLowerCase() === 'withscores') {
      range.push(s);
    }
  }
  helpers.callCallback(callback, null, range);
};

/**
getRangeByScore (zrangebyscore & zrevrangebyscore)
**/
const getRangeByScore = function(
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
    return;
  }
  if ('function' === typeof withscores) {
    callback = withscores;
    withscores = undefined;
  }
  if ('function' === typeof limit) {
    callback = limit;
    limit = undefined;
  }
  if (!callback) {
    callback = mockCallback;
  }
  if (!validKeyType(mockInstance, key, callback)) {
    return;
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

  helpers.callCallback(callback, null, range);

};

// ZADD key [NX|XX] [CH] [INCR] score member [score member ...]
// Add one or more members to a sorted set, or update its score if it already exists
exports.zadd = function(key, flags, scoresAndMembers, callback) {
  // init key
  initKey(this, key);

  // declare opts
  const {nx, xx, ch, incr} = flags;
  let count = 0;

  for (let {score, member} of scoresAndMembers) {  // eslint-disable-line prefer-const
    const existingScore = this.storage[key].value[member];
    const exists = typeof existingScore !== 'undefined';

    if ((nx && exists) || (xx && !exists)) {
      continue;
    }

    score = score.toString();

    // updating score if memeber doesn't exist
    // or if ch = true and score changes
    if (!exists || (ch && existingScore != score)) { // eslint-disable-line eqeqeq
      count += 1;
    }

    // do we need to incr (existing score + score)?
    if (incr && existingScore) {
      score = parseFloat(existingScore) + parseFloat(score);
      score = String(score);
    }

    this.storage[key].value[member] = score;

    // only one member is allowed update
    // if we have an incr
    // this shold behave the same as zincrby
    // so return the score instead of the updatedCount;
    if (incr) {
      count = score;
      break;
    }
  }

  helpers.callCallback(callback, null, count);
};

// ZCARD key
// Get the number of members in a sorted set
exports.zcard = function(key, callback) {
  const len = arguments.length;
  if (len < 1) {
    return;
  }
  if (!callback) {
    callback = mockCallback;
  }
  if (!validKeyType(this, key, callback)) {
    return;
  }
  initKey(this, key);
  const count = Object.keys(this.storage[key].value).length;
  helpers.callCallback(callback, null, count);
};

// ZCOUNT key min max
// Count the members in a sorted set with scores within the given values
exports.zcount = function(key, min, max, callback) {
  const parse = (err, result) => {
    if (err) {
      return helpers.callCallback(callback, err);
    }
    helpers.callCallback(callback, null, result.length);
  };
  this.zrangebyscore(key, min, max, parse);
};

// ZINCRBY key increment member
// Increment the score of a member in a sorted set
exports.zincrby = function(key, increment, member, callback) {
  var len = arguments.length;
  if (len < 4) {
    return;
  }
  if (!callback) {
    callback = mockCallback;
  }
  if (!validKeyType(this, key, callback)) {
    return;
  }
  initKey(this, key);
  member = Item._stringify(member);
  var s = this.storage[key].value[member];
  var score = parseFloat( s !== undefined ? s : '0');
  increment = parseFloat(String(increment));
  score += increment;
  score = String(score);
  this.storage[key].value[member] = score;
  helpers.callCallback(callback, null, score);
};

// ZRANGE key start stop [WITHSCORES]
// Return a range of members in a sorted set, by index
exports.zrange = function(key, start, stop, withscores, callback) {
  getRange(this, key, start, stop, withscores, callback, false);
};

// ZRANGEBYSCORE key min max [WITHSCORES] [LIMIT offset count]
// Return a range of members in a sorted set, by score
exports.zrangebyscore = function(
  key,
  min,
  max,
  withscores,
  limit,
  offset,
  count,
  callback) {

  getRangeByScore(
    this,
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
exports.zrank = function(key, member, callback) {
  getRank(this, key, member, callback, false);
};

// ZREM key member [member ...]
// Remove one or more members from a sorted set
exports.zrem = function(key) {
  var len = arguments.length;
  if (len <= 2) {
    return;
  }

  var callback = helpers.parseCallback(arguments);
  if (!callback) {
    callback = mockCallback;
  }
  if (!validKeyType(this, key, callback)) {
    return;
  }
  initKey(this, key);
  // The number of members removed from the sorted set,
  // not including non existing members.
  var count = 0;
  for (var i=1, member; i < len; i++) {
    member = arguments[i];
    if ('function' === typeof member) {
      break;
    }
    member = Item._stringify(member);
    if (this.storage[key].value[member]) {
      delete this.storage[key].value[member];
      count += 1;
    }
  }
  helpers.callCallback(callback, null, count);
};

// ZREMRANGEBYRANK key start stop
// Remove all members in a sorted set within the given indexes
exports.zremrangebyrank = function(key, start, stop, callback) {
  const deleteResults = (err, results) => {
    if (err) {
      return helpers.callCallback(callback, err);
    }
    let count = 0;
    for (let i = 0, member; i < results.length; i++) {
      member = results[i];
      if (this.storage[key].value[member]) {
        delete this.storage[key].value[member];
        count += 1;
      }
    }
    helpers.callCallback(callback, null, count);
  };
  getRange(this, key, start, stop, deleteResults, false);
};

// ZREMRANGEBYSCORE key min max
// Remove all members in a sorted set within the given scores
exports.zremrangebyscore = function(key, min, max, callback) {
  const deleteResults = (err, results) => {
    if (err) {
      return helpers.callCallback(callback, err);
    }
    let count = 0;
    for (let i = 0, member; i < results.length; i++) {
      member = results[i];
      if (this.storage[key].value[member]) {
        delete this.storage[key].value[member];
        count += 1;
      }
    }
    helpers.callCallback(callback, null, count);
  };
  getRangeByScore(this, key, min, max, deleteResults, false);
};


// ZREVRANGE key start stop [WITHSCORES]
// Return a range of members in a sorted set, by index, with scores ordered from high to low
exports.zrevrange = function(key, start, stop, withscores, callback) {
  getRange(this, key, start, stop, withscores, callback, true);
};

// ZREVRANGEBYSCORE key max min [WITHSCORES] [LIMIT offset count]
// Return a range of members in a sorted set, by score, with scores ordered from high to low
exports.zrevrangebyscore = function(
  key,
  max,
  min,
  withscores,
  limit,
  offset,
  count,
  callback) {

  getRangeByScore(
    this,
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
exports.zrevrank = function(key, member, callback) {
  getRank(this, key, member, callback, true);
};

// ZSCORE key member
// Get the score associated with the given member in a sorted set
exports.zscore = function(key, member, callback) {
  const len = arguments.length;
  if (len < 2) {
    return;
  }
  if (callback === undefined) {
    callback = mockCallback;
  }
  if (!validKeyType(this, key, callback)) {
    return;
  }
  initKey(this, key);
  const score = this.storage[key].value[Item._stringify(member)];
  helpers.callCallback(callback, null, (score === undefined ? null : score));
};

// ZUNIONSTORE key argcount member, members...
exports.zunionstore = function(destination, numKeys) {
  if (arguments.length < 2) {
    return;
  }

  // Callback function (last arg)
  const c = arguments[arguments.length - 1];
  const callback = typeof c === 'function' && c || mockCallback;

  // Parse arguments
  const srcKeys = Array.from(arguments).slice(2, 2 + Number(numKeys));

  // Print out warning if bad keys were passed in
  if (srcKeys.length === 0) {
    console.warn('Warning: No keys passed in to ZUNIONSTORE'); // eslint-disable-line no-console
  }
  if(srcKeys.some((key) => !key)) {
    console.warn('Warning: Undefined or null key(s) provided to ZUNIONSTORE:', srcKeys); // eslint-disable-line no-console
  }

  let sourcesProcessed = 0;
  srcKeys.forEach((srcKey) => {
    getRange(this, srcKey, 0, -1, 'withscores', (err, srcVals) => {
      let srcItemsProcessed = 0;

      // Did we select an empty source?
      if (!srcVals || srcVals.length === 0) {
        sourcesProcessed++;
        // Done with all sources?
        if (sourcesProcessed === srcKeys.length) {
          initKey(this, destination);
          helpers.callCallback(callback, null, Object.keys(this.storage[destination].value).length);
          return;
        }
      }

      // Add items one-by-one (because value / score order is flipped on zadd vs. zrange)
      for(let i = 0; i < (srcVals.length -1); i = i+2) {
        //                                              score         member
        this.zadd(destination, {}, [{score: srcVals[i+1], member: srcVals[i]}]);
        srcItemsProcessed++;

        // Done with all items in this source?
        if (srcItemsProcessed === srcVals.length / 2) {
          sourcesProcessed++;
        }
        // Done with all sources?
        if (sourcesProcessed === srcKeys.length) {
          initKey(this, destination);
          helpers.callCallback(callback, null, Object.keys(this.storage[destination].value).length);
        }
      }
    });
  });

  // TODO: Support: [WEIGHTS weight [weight ...]]
  // TODO: Support: [AGGREGATE SUM|MIN|MAX]
};


/* Is the provided prop present in all provided objects? */
const allObjsHaveKey = function(prop, objs) {
  return objs.every( function(o) {
    return !!o[prop];
  });
};

/* Sum of the given prop, as found in all the given objects */
var sumPropInObjs = function(prop, objs) {
  return objs.reduce( function(sum, o) {
    return sum + Number(o[prop] || '0');
  }, 0);
};

// ZINTERSTORE key argcount member, members...
exports.zinterstore = function(destination, numKeys) {
  if (arguments.length < 2) {
    return;
  }

  // Callback function (last arg)
  const c = arguments[arguments.length - 1];
  const callback = typeof c === 'function' && c || mockCallback;

  // Parse arguments
  const srcKeys = Array.from(arguments).slice(2, 2 + Number(numKeys));

  // Destination storage
  const dest = {}; // Key -> Score mapping

  // Source keys storage (filtering out non-existent ones)
  const sources = srcKeys
    .map((srcKey) => this.storage[srcKey] ? this.storage[srcKey].value : null)
    .filter((src) => !!src);

  // Compute intersection (inefficiently)
  sources.forEach((source) => {
    Object.keys(source).forEach((key) => {
      if (allObjsHaveKey(key, sources)) {
        dest[key] = String(sumPropInObjs(key, sources));
      }
    });
  });

  // Store results
  initKey(this, destination);
  const destValues = Object.keys(dest);
  destValues.forEach((value) => {
    this.zadd(destination, {}, [{score: dest[value], member: value}]);
  });

  helpers.callCallback(callback, null, destValues.length);

  // TODO: Support: [WEIGHTS weight [weight ...]]
  // TODO: Support: [AGGREGATE SUM|MIN|MAX]
};
