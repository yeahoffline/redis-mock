'use strict';

const {Multi} = require("./client/multi");
const RedisClient = require('./client/redis-client');
const errors = require('./errors');
const createClient = require('./client/createClient');

module.exports = {
  AbortError: errors.AbortError,
  AggregateError: errors.AggregateError,
  ParserError: errors.ParserError,
  RedisError: errors.RedisError,
  ReplyError: errors.ParserError,

  RedisClient,
  Multi,
  createClient
};
