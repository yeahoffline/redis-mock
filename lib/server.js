/**
 * flushdb
 */
exports.flushdb = function (mockInstance, callback) {
  mockInstance.databases[mockInstance.currentDatabase] = {};
  mockInstance.storage = mockInstance.databases[mockInstance.currentDatabase];

  mockInstance._callCallback(callback, null, 'OK');
};

exports.select = function(mockInstance, databaseIndex) {
  mockInstance.currentDatabase = databaseIndex;
  mockInstance.storage = mockInstance.databases[databaseIndex];
};

/**
 * flushall
 */
exports.flushall = function (mockInstance, callback) {
  for (var i = 0; i < mockInstance.databases.length; i++) {
    mockInstance.databases[i] = {};
  }
  mockInstance.storage = mockInstance.databases[mockInstance.currentDatabase];

  mockInstance._callCallback(callback, null, 'OK');
};

/**
 * auth
 */
exports.auth = function auth(mockInstance, password, callback) {
  mockInstance._callCallback(callback, null, 'OK');
};
