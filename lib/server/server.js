'use strict';

/**
 * flushdb
 */
exports.flushdb = function (callback) {
  this.databases[this.currentDatabase] = {};
  this.storage = this.databases[this.currentDatabase];

  this._callCallback(callback, null, 'OK');
};

exports.select = function(databaseIndex) {
  this.currentDatabase = databaseIndex;
  this.storage = this.databases[databaseIndex];
};

/**
 * flushall
 */
exports.flushall = function (callback) {
  for (let i = 0; i < this.databases.length; i++) {
    this.databases[i] = {};
  }
  this.storage = this.databases[this.currentDatabase];

  this._callCallback(callback, null, 'OK');
};

/**
 * auth
 */
exports.auth = function auth(password, callback) {
  this._callCallback(callback, null, 'OK');
};
