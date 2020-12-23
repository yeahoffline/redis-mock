const charMap = {
  '?': '.',
  '\\?': '\\?',
  '*': '.*',
  '\\*': '\\*',
  '^': '\\^',
  '[^': '[^',
  '\\[^': '\\[\\^',
  '$': '\\$',
  '+': '\\+',
  '.': '\\.',
  '(': '\\(',
  ')': '\\)',
  '{': '\\{',
  '}': '\\}',
  '|': '\\|'
};

const patternChanger = /\\\?|\?|\\\*|\*|\\\[\^|\[\^|\^|\$|\+|\.|\(|\)|\{|\}|\|/g;

const maxDatabaseCount = 16;

/* Converting pattern into regex */
exports.patternToRegex = function(pattern) {
  const fixed = pattern.replace(patternChanger, function(matched) {
    return charMap[matched];
  });
  return new RegExp('^' + fixed + '$');
};

exports.getMaxDatabaseCount = function() {
  return maxDatabaseCount;
};

const callCallback = exports.callCallback = (callback, err, result) => {
  if (typeof callback === 'function') {
    process.nextTick(() => {
      callback(err, result);
    });
  }
};

exports.noOpCallback = function(err, reply) {}; //eslint-disable-line no-empty-function

exports.parseCallback = function(args) {
  let callback;
  const len = args.length;
  if ('function' === typeof args[len - 1]) {
    callback = args[len-1];
  }
  return callback;
};

exports.validKeyType = function(mockInstance, key, type, callback) {
  if (mockInstance.storage[key] && mockInstance.storage[key].type !== type) {
    const err = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    callCallback(callback, err);
    return false;
  }
  return true;
};

exports.initKey = function(mockInstance, key, fn) {
  mockInstance.storage[key] = mockInstance.storage[key] || fn();
};

exports.shuffle = function(array) {
  let counter = array.length;

  // While there are elements in the array
  while (counter > 0) {
    // Pick a random index
    const index = Math.floor(Math.random() * counter);

    // Decrease counter by 1
    counter--;

    // And swap the last element with it
    const temp = array[counter];
    array[counter] = array[index];
    array[index] = temp;
  }

  return array;
};
