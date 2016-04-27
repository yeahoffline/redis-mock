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
  var fixed = pattern.replace(patternChanger, matched => charMap[matched]);
  return new RegExp('^' + fixed + '$');
}
