'use strict';

module.exports.RedisError = class extends Error {

  constructor(code, message) {
    super(message);
    this.code = code;
  }

};

module.exports.AbortError = class AbortError extends Error {};
module.exports.AggregateError = class AggregateError extends Error {};
module.exports.ParserError = class ParserError extends Error {};
module.exports.AbortError = class AbortError extends Error {};
module.exports.ReplyError = class ReplyError extends Error {};
