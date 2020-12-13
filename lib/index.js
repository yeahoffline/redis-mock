'use strict';

const realRedis = require('redis');
const multi = require("./multi");
const RedisClient = require('./redis-client');

module.exports = {
  AbortError: realRedis.AbortError,
  AggregateError: realRedis.AggregateError,
  ParserError: realRedis.ParserError,
  RedisError: realRedis.RedisError,
  ReplyError: realRedis.ReplyError,

  RedisClient: RedisClient,
  Multi: multi.Multi,
  createClient: (port_arg, host_arg, options) => new RedisClient()
};
