var charMap = {
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

var patternChanger = /\\\?|\?|\\\*|\*|\\\[\^|\[\^|\^|\$|\+|\.|\(|\)|\{|\}|\|/g;

/* Converting pattern into regex */
exports.patternToRegex = function(pattern) {
  var fixed = pattern.replace(patternChanger, function(matched) {
    return charMap[matched]
  });
  return new RegExp('^' + fixed + '$');
}

var mockCallback = exports.mockCallback = function(err, reply) {}; //eslint-disable-line no-empty-function

var parseCallback = exports.parseCallback = function(args) {
  var callback;
  var len = args.length;
  if ('function' === typeof args[len - 1]) {
    callback = args[len-1];
  }
  return callback;
};

var validKeyType = exports.validKeyType = function(mockInstance, key, type, callback) {
  if (mockInstance.storage[key] && mockInstance.storage[key].type !== type) {
    var err = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    mockInstance._callCallback(callback, err);
    return false;
  }
  return true;
};

var initKey = exports.initKey = function(mockInstance, key, fn) {
  mockInstance.storage[key] = mockInstance.storage[key] || fn();
};

var shuffle = exports.shuffle = function(array) {
  var counter = array.length;

  // While there are elements in the array
  while (counter > 0) {
    // Pick a random index
    var index = Math.floor(Math.random() * counter);

    // Decrease counter by 1
    counter--;

    // And swap the last element with it
    var temp = array[counter];
    array[counter] = array[index];
    array[index] = temp;
  }

  return array;
};
