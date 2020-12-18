'use strict';

const RedisClient = require('./redis-client');
const parseRedisUrl = require('../utils/parseRedisUrl');

/**
 * Generating the default options for the case when the createClient() was called with no params
 */
const generateDefaultOptions = () => ({
  host: '127.0.0.1',
  port: 6379,
});

const normalizeOptions = (options) => Object.assign(
  generateDefaultOptions(),
  options.url ? parseRedisUrl(options.url) : {},
  options
);

/**
 * Handling the override: redis.createClient(redis_url[, options])
 */
const generateUrlOptions = (url, options) => Object.assign({
  url
}, generateDefaultOptions(), parseRedisUrl(url), options);

/**
 * Handling the override: redis.createClient(port[, host][, options])
 */
const generatePortHostOptions = (port, host, options) => Object.assign({
  port,
  host
}, generateDefaultOptions(), options);

/**
 * The createClient function has multiple overrides.
 * It is cleaned up over here to present it in a unified format
 *
 * @param opts - array of options that contains any of the following overloads:
 *
 * redis.createClient([options])
 * redis.createClient(unix_socket[, options])
 * redis.createClient(redis_url[, options])
 * redis.createClient(port[, host][, options])
 */
const unifyOptions = (opts) => {
  // createClient()
  if (opts.length === 0) {
    return generateDefaultOptions();
  }

  // createClient(options)
  if (typeof opts[0] === 'object') {
    return normalizeOptions(opts[0]);
  }

  // createClient(port[, host][, options])
  if (!isNaN(opts[0])) {
    return generatePortHostOptions(parseInt(opts[0], 10), opts[1], opts[2]);
  }
  return generateUrlOptions(opts[0], opts[1]);
};

module.exports = (...opts) => new RedisClient(unifyOptions(opts), null);
