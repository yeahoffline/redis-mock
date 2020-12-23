'use strict';

module.exports.RedisError = class extends Error {

  constructor(code, message) {
    super(message);
    this.code = code;
  }

};

module.exports.AbortError = class extends Error {};
module.exports.AggregateError = class extends Error {};
module.exports.ParserError = class extends Error {};
module.exports.AbortError = class extends Error {};
module.exports.ReplyError = class extends Error {};
