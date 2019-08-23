/**
 * flushdb
 */
var flushdb = exports.flushdb = function (mockInstance, callback) {
  mockInstance.databases[mockInstance.currentDatabase] = {};
  mockInstance.storage = mockInstance.databases[mockInstance.currentDatabase];

  mockInstance._callCallback(callback, null, 'OK');
}

var select = exports.select = function(mockInstance, databaseIndex) {
  mockInstance.currentDatabase = databaseIndex;
  mockInstance.storage = mockInstance.databases[databaseIndex];
}

/**
 * flushall
 * Exact the same as flushdb because multiple db is not supported yet
 */
var flushall = exports.flushall = function (mockInstance, callback) {
  for (let i = 0; i < mockInstance.databases.length; i++) {
    mockInstance[i] = {};
  }
  mockInstance.storage = mockInstance.databases[mockInstance.currentDatabase];
};

/**
 * auth
 */
exports.auth = function auth(mockInstance, password, callback) {
  mockInstance._callCallback(callback, null, 'OK');
}
