'use strict';

const redis = require('redis');
const redisMock = require('../../lib');
const types = require('../../lib/utils/types');

require("should");

// this is just a unit test. No need to run this against the real redis
if (process.env.VALID_TESTS) {
  return;
}

describe.skip('Given real redis library and the mock', () => {

  const findMissingRealMethods = (real, mock) => {
    const realMethods = types.getMethods(redis).public();
    const mockMethods = types.getMethods(mock).public();

    return realMethods.filter((realMethod) => !mockMethods.find((mockMethod) => mockMethod === realMethod));
  };

  describe('When listing all public methods in both', () => {
    it('roots, Then, the result is the same', () => {
      const missingMethods = findMissingRealMethods(redis, redisMock);

      missingMethods.length.should.be.equal(
        0,
        'The mock is missing the following methods that are present in the real library: ' + missingMethods.join(', ')
      )

      const wtfMethods = findMissingRealMethods(redisMock, redis);

      wtfMethods.length.should.be.equal(
        0,
        'The MockRedis implements the following methods that come from god knows where and should be removed: ' + wtfMethods.join(', ')
      );
    });

    // TODO: verify that not only all methods are in place, but also that they have the same number of parameters

    // TODO: verify that all classes that are exported from the index have the same methods
  });

});
