'use strict';

const parseRedisUrl = require('../../lib/utils/parseRedisUrl');
require('should');

// this is just a unit test. No need to run this against the real redis
if (process.env.VALID_TESTS) {
  return;
}

describe('Given the parseRedisUrl', () => {

  it('When calling it with redis://localhost:1234, Then it successfully parses the host and the port', () => {
    const result = parseRedisUrl('redis://localhost:1234');

    result.should.deepEqual({
      host: 'localhost',
      port: 1234
    });
  });

  it('When calling it with redis://localhost:1234/abc, Then it successfully parses the host, port and path', () => {
    const result = parseRedisUrl('redis://localhost:1234/abc/def');

    result.should.deepEqual({
      host: 'localhost',
      port: 1234,
      path: '/abc/def'
    });
  });

  it('When calling it with rediss://localhost:1234/abc/def?option=123&db=1, Then it successfully parses the host, port, path and db', () => {
    const result = parseRedisUrl('rediss://localhost:1234/abc/def?option=123&db=1');

    result.should.deepEqual({
      host: 'localhost',
      port: 1234,
      path: '/abc/def',
      db: '1',
      option: '123'
    });
  });

});
