'use strict';

class RedisDb {

  constructor() {
    this.storage = {};
  }

  /**
   * TODO: drop. the only callback handling needed should be the one in redis-client
   *
   * @deprecated
   */
  _callCallback(callback, err, result) {
    if (typeof callback === 'function') {
      process.nextTick(() => {
        callback(err, result);
      });
    }
  }

  flushdb(callback) {
    this.storage = {}

    this._callCallback(callback, null, 'OK');
  }
}

/**
 * Import all methods
 *
 * The server contains a log of logic. It only feels natural to split it into multiple files
 */
['./strings', './keys', './hash', './set', './list.js', './sortedset'].
  forEach((lib) => Object.assign(RedisDb.prototype, require(lib)));

module.exports = RedisDb;
