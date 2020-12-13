'use strict';

const events = require("events");
const helpers = require("./helpers");

class RedisMock extends events.EventEmitter {

  constructor() {
    super();

    // Initialize an array of empty objects
    this.databases = new Array(helpers.getMaxDatabaseCount()).
      fill().
      map((_) => ({}));

    this.currentDatabase = 0; // TODO: this is already proven not to work as expected. Drop this
                              // and instead create multiple instances of RedisMock depending on the params
                              // passed to createClient()

    // Reference to the currently selected database
    this.storage = this.databases[this.currentDatabase];
  }

  /**
   * Helper function to launch the callback(err, reply)
   * on the next process tick
   *
   * TODO: drop. it's not the server's problem to call the callback.
   * It is done by the client library. So should be the case over here.
   */
  _callCallback(callback, err, result) {
    if (typeof callback === 'function') {
      process.nextTick(() => {
        callback(err, result);
      });
    }
  }
}

/**
 * Import all methods
 *
 * The server contains a log of logic. It only feels natural to split it into multiple files
 */
['./strings', './keys.js', './hash.js']
  .forEach(lib => Object.assign(RedisMock.prototype, require(lib)));

/*
 * Create RedisMock instance
 */
const MockInstance = new RedisMock();

module.exports = MockInstance;
