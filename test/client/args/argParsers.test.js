'use strict';

const parsers = require('../../../lib/client/args/argParsers');
const should = require('should');

describe('Given the ArgumentParser definitions, When parsing', () => {

  /**
   * ZADD key [NX|XX] [GT|LT] [CH] [INCR] score member [score member ...]
   */
  describe('"zadd" with arguments', () => {

    it('myzset 1 "one", Then it should be successfully parsed', () => {
      const result = parsers.zadd.parse(['myzset', 1, 'one']);

      result.should.deepEqual({
        default: {
          key: 'myzset',
        },
        named: {},
        flags: {
          gt: false,
          lt: false,
          nx: false,
          xx: false,
          ch: false,
          incr: false
        },
        multiple: [
          {
            score: 1,
            member: 'one'
          }
        ]
      });
    });

    it('myzset 1 nx gt "one", Then it should be successfully parsed', () => {
      const result = parsers.zadd.parse(['myzset', 'nx', 'gt', 1, 'one']);

      result.should.deepEqual({
        default: {
          key: 'myzset',
        },
        named: {},
        flags: {
          gt: true,
          lt: false,
          nx: true,
          xx: false,
          ch: false,
          incr: false
        },
        multiple: [
          {
            score: 1,
            member: 'one'
          }
        ]
      });
    });

    it('myzset 1 "one" 2 "two" 3 three, Then it should be successfully parsed', () => {
      const result = parsers.zadd.parse(['myzset', 1, 'one', 2, 'two', 3, 'three']);

      result.should.deepEqual({
        default: {
          key: 'myzset',
        },
        named: {},
        flags: {
          gt: false,
          lt: false,
          nx: false,
          xx: false,
          ch: false,
          incr: false
        },
        multiple: [
          {
            score: 1,
            member: 'one'
          },
          {
            score: 2,
            member: 'two'
          },
          {
            score: 3,
            member: 'three'
          }
        ]
      });
    });

    it('myzset "1" "one" (the number passed as string), Then it should be successfully parsed', () => {
      const result = parsers.zadd.parse(['myzset', '1', 'one']);

      result.should.deepEqual({
        default: {
          key: 'myzset',
        },
        named: {},
        flags: {
          gt: false,
          lt: false,
          nx: false,
          xx: false,
          ch: false,
          incr: false
        },
        multiple: [
          {
            score: 1,
            member: 'one'
          }
        ]
      });
    });

  });

  /**
   * SCAN cursor [MATCH pattern] [COUNT count] [TYPE type]
   */
  describe('"scan" with arguments', () => {
    it('123, Then cursors is initialized with abc', () => {
      const result = parsers.scan.parse(['123']);

      result.should.deepEqual({
        default: {
          cursor: 123
        },
        named: {},
        flags: {},
        multiple: []
      });
    });

    it('"123 match lol count 1" , Then cursors is initialized with abc', () => {
      const result = parsers.scan.parse(['123', 'match', 'lol', 'count', '1']);

      result.should.deepEqual({
        default: {
          cursor: 123
        },
        named: {
          match: 'lol',
          count: 1
        },
        flags: {},
        multiple: []
      });
    });
  });

  /**
   * SET key value [EX seconds|PX milliseconds|KEEPTTL] [NX|XX] [GET]
   */
  describe('"set" with arguments', () => {
    it('with all possible arguments, Then they are successfully parsed', () => {
      const result = parsers.set.parse(['testKey', 'testValue', 'ex', '2', 'nx']);

      should(result).deepEqual({
        default: {
          key: 'testKey',
          value: 'testValue'
        },
        named: {
          ex: 2
        },
        flags: {
          keepttl: false,
          nx: true,
          xx: false
        },
        multiple: []
      });
    });

    it('with arguments in a different order than specified in the definition, Then they are successfully parsed', () => {
      const result = parsers.set.parse(['testKey', 'testValue', 'nx', 'ex', '2']);

      should(result).deepEqual({
        default: {
          key: 'testKey',
          value: 'testValue'
        },
        named: {
          ex: 2
        },
        flags: {
          keepttl: false,
          nx: true,
          xx: false
        },
        multiple: []
      });
    });

    it('with the default arguments, then it should be parsed successfully', () => {
      const result = parsers.set.parse(['testKey', 'testValue']);

      should(result).deepEqual({
        default: {
          key: 'testKey',
          value: 'testValue'
        },
        named: {},
        flags: {
          keepttl: false,
          nx: false,
          xx: false
        },
        multiple: []
      });
    });
  });

});
