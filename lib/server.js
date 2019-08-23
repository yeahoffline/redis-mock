/**
 * flushdb
 */
var flushdb = exports.flushdb = function (mockInstance, callback) {
  mockInstance.storage = {};

  mockInstance._callCallback(callback, null, 'OK');
}

var select = exports.select = function(mockInstance, databaseIndex) {
  mockInstance.storage = mockInstance.databases[databaseIndex];
}

/**
 * flushall
 */
var flushall = exports.flushall = function (mockInstance, callback) {
  for (let i = 0; i < mockInstance.databases.length; i++) {
    mockInstance[i] = {};
  }

  mockInstance._callCallback(callback, null, 'OK');
};

/**
 * auth
 */
exports.auth = function auth(mockInstance, password, callback) {
  mockInstance._callCallback(callback, null, 'OK');
}
