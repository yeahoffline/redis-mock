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
    const realMethods = types.getMethods(real).public();
    const mockMethods = types.getMethods(mock).public();

    return realMethods.filter((realMethod) => !mockMethods.find((mockMethod) => mockMethod === realMethod));
  };

  describe('When listing all public methods in both', () => {
    it('roots, Then the result is the same', () => {
      const missingMethods = findMissingRealMethods(redis, redisMock);

      missingMethods.length.should.be.equal(
        0,
        'The mock is missing the following methods that are present in the real library: ' + missingMethods.join(', ')
      );
    });

    it('clients, Then the result is the same', () => {
      const missingMethods = findMissingRealMethods(redis.createClient(), redisMock.createClient());

      missingMethods.length.should.be.equal(
        0,
        'The mock is missing the following methods that are present in the real library: ' + missingMethods.join(', ')
      );
    });
  });

});
