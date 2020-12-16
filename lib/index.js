'use strict';

const multi = require("./client/multi");
const RedisClient = require('./client/redis-client');
const errors = require('./server/errors');

module.exports = {
  AbortError: errors.AbortError,
  AggregateError: errors.AggregateError,
  ParserError: errors.ParserError,
  RedisError: errors.RedisError,
  ReplyError: errors.ParserError,

  RedisClient: RedisClient,
  Multi: multi.Multi,
  createClient: (port_arg, host_arg, options) => new RedisClient()
};
