/**
 * flushdb
 */
var flushdb = exports.flushdb = function (mockInstance, callback) {
  mockInstance.storage = {};

  mockInstance._callCallback(callback, null, 'OK');
}

/**
 * flushall
 * Exact the same as flushdb because multiple db is not supported yet
 */
exports.flushall = flushdb;

/**
 * auth
 */
exports.auth = function auth(mockInstance, password, callback) {
  mockInstance._callCallback(callback, null, 'OK');
}
