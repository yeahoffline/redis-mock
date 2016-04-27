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
  var fixed = pattern.replace(patternChanger, function(matched) { return charMap[matched] });
  return new RegExp('^' + fixed + '$');
}
