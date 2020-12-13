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

    this.currentDatabase = 0;

    // Reference to the currently selected database
    this.storage = this.databases[this.currentDatabase];
  }

  /**
   * Helper function to launch the callback(err, reply)
   * on the next process tick
   */
  _callCallback(callback, err, result) {
    if (typeof callback === 'function') {
      process.nextTick(() => {
        callback(err, result);
      });
    }
  }
}

/*
 * Create RedisMock instance
 */
const MockInstance = new RedisMock();

module.exports = MockInstance;
