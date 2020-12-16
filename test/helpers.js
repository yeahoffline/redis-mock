const redismock = process.env['VALID_TESTS']
  ? require('redis')
  : require("../");

function createClient() {
  const options = {
    detect_buffers: true,
    url: process.env['REDIS_URL'] || 'redis://127.0.0.1:6379'
  }
  return redismock.createClient(options);
}

module.exports = {
  createClient: createClient
};
