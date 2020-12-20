'use strict';

const events = require("events");
const helpers = require("../helpers");
const RedisDb = require("./redis-db");

class RedisMock extends events.EventEmitter {

  constructor() {
    super();

    // Initialize an array of empty objects
    this._databases = [];
    for (let i = 0; i < helpers.getMaxDatabaseCount(); i++) {
      this._databases.push(new RedisDb());
    }
  }

  select(id) {
    return this._databases[id];
  }

  flushall() {
    this._databases.forEach((db) => db.flushdb());

    return 'OK';
  }

  auth(password) {
    return 'OK';
  }
}

module.exports = RedisMock;
