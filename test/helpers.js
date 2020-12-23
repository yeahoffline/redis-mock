const redismock = process.env.VALID_TESTS
  ? require('redis')
  : require("../");

function createClient(opts) {
  let options = {
    detect_buffers: true,
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
  };
  if (typeof opts === 'string') {
    return redismock.createClient(opts, options);
  }
  if (typeof opts === 'object') {
    options = Object.assign(options, opts);
  }
  return redismock.createClient(options);
}

module.exports = {
  createClient: createClient
};
