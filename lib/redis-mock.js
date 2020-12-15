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

    this.currentDatabase = 0; // TODO: this is already proven not to work as expected when the db index
                              // selection happens through the createClient() parameter

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
 * TODO: move this file and all of the files it depends on to a separate directory
 *
 * The server contains a log of logic. It only feels natural to split it into multiple files
 */
['./strings', './keys', './hash', './server', './set', './list.js']
  .forEach(lib => Object.assign(RedisMock.prototype, require(lib)));

/*
 * Create RedisMock instance
 *
 * TODO: drop the global instance. client should have 1 reference to the mock server
 * and that's it. This way you can have multiple servers for multiple clients, or 1 server can be shared
 * between multiple clients. Everything depending on whether you call the createClient()
 * with the same URL or not
 */
const MockInstance = new RedisMock();

module.exports = MockInstance;
