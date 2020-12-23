'use strict';

const should = require("should");
const {ArgumentParser} = require("../../../lib/client/args/ArgumentParser");
const { set } = require('../../../lib/client/args/argParsers');

// this is just a unit test. No need to run this against the real redis
if (process.env.VALID_TESTS) {
  return;
}

describe('ArgumentParser', () => {

  describe('when parsing 2 named arguments', () => {

    const parser = new ArgumentParser('test', {
      named: {
        match: {
          type: String
        },
        count: {
          type: Number
        }
      }
    });

    it('and specifying another one that does not have any definition, then an error is thrown', () => {
      should.throws(() => parser.parse(['test', 'nope']));
    });

    it('And both of them are provided, Then both are correctly parsed', () => {
      const result = parser.parse(['match', '*', 'count', 5]);

      result.should.be.deepEqual({
        default: {},
        named: {
          match: '*',
          count: 5
        },
        flags: {},
        multiple: []
      });
    });

    it('And only one of them is provided, Then that it is correctly parsed', () => {
      const result = parser.parse(['match', '*']);

      result.should.be.deepEqual({
        default: {},
        named: {
          match: '*'
        },
        flags: {},
        multiple: []
      });
    });

    it('And only one of them is provided, but is defined as a numeric string instead of number, Then that it is correctly parsed', () => {
      const result = parser.parse(['count', '5']);

      result.should.be.deepEqual({
        default: {},
        named: {
          count: 5
        },
        flags: {},
        multiple: []
      });
    });

    it('And only one of them is provided, but is defined as an abstract string instead of number, Then an error is thrown', () => {
      should.throws(() => parser.parse(['count', 'wrongValue']));
    });

    it('And neither one of them is provided, Then an empty object is returned by the parser', () => {
      const result = parser.parse([]);

      result.should.be.deepEqual({
        default: {},
        named: {},
        flags: {},
        multiple: []
      });
    });

  });

  describe('When parsing 2 mutually exclusive named arguments', () => {

    const parser = new ArgumentParser('test', {
      named: {
        ex: {
          type: Number,
          exclusivityKey: 'time'
        },
        px: {
          type: Number,
          exclusivityKey: 'time'
        }
      }
    });

    it('and both of them are provided, then an error is thrown', () => {
      should.throws(() => parser.parse(['px', 1, 'ex', 2]));
    });

    it('and only the first one is provided, then the arguments are parsed successfully', () => {
      const result = parser.parse(['ex', 2]);

      should(result).deepEqual({
        default: {},
        named: {
          ex: 2,
        },
        flags: {},
        multiple: []
      });
    });

    it('and only the second one is provided, then the arguments are parsed successfully', () => {
      const result = parser.parse(['px', 1]);

      should(result).deepEqual({
        default: {},
        named: {
          px: 1,
        },
        flags: {},
        multiple: []
      });
    });

  });

  describe('When parsing a flag and and a named parameter sharing the same exclusivityKey', () => {
    const parser = new ArgumentParser('test', {
      named: {
        px: {
          type: Number,
          exclusivityKey: 'time'
        },
      },
      flags: {
        keepttl: {
          exclusivityKey: 'time'
        }
      }
    });

    it('and both of them are provided, then an error is thrown', () => {
      should.throws(() => parser.parse(['px', 1, 'keepttl']));
    });

    it('and only the named parameter is provided, then the arguments are parsed successfully', () => {
      const result = parser.parse(['px', 1]);

      should(result).deepEqual({
        default: {},
        named: {
          px: 1,
        },
        flags: {
          keepttl: false
        },
        multiple: []
      });
    });

    it('and only the flag is provided, then the arguments are parsed successfully', () => {
      const result = parser.parse(['keepttl']);

      should(result).deepEqual({
        default: {},
        named: {},
        flags: {
          keepttl: true
        },
        multiple: []
      });
    });

  });

  describe('When the named argument is required', () => {

    const parser = new ArgumentParser('test', {
      named: {
        required: {
          type: String,
          required: true
        }
      }
    });

    it('And it is provided, Then it is successfully parsed', () => {
      const result = parser.parse(['required', 'test']);

      result.should.be.deepEqual({
        default: {},
        named: {
          required: 'test'
        },
        flags: {},
        multiple: []
      });
    });

    it('And it is not provided, Then an error is thrown', () => {
      should.throws(() => parser.parse([]));
    });

  });

  describe('when parsing arguments for a command with a default argument definition', () => {

    const parser = new ArgumentParser('test', {
      default: [
        {
          type: String,
          name: 'testDefault'
        }
      ],
      named: {
        named: {
          type: String,
          required: false
        }
      }
    });

    it('and the default argument is defined, then it is successfully parsed', () => {
      const result = parser.parse(['defaultValue']);

      result.should.deepEqual({
        default: {
          testDefault: 'defaultValue'
        },
        named: {},
        flags: {},
        multiple: []
      });
    });

    it('and both the default argument and the named argument are defined, then it is successfully parsed', () => {
      const result = parser.parse(['defaultValue', 'named', 'namedValue']);

      result.should.deepEqual({
        default: {
          testDefault: 'defaultValue',
        },
        named: {
          named: 'namedValue'
        },
        flags: {},
        multiple: []
      });
    });

    it('and the default argument is missing then the error is thrown', () => {
      should.throws(() => parser.parse([]));
    });

    it('and the default argument is missing, but a named argument is present, Then an error is thrown', () => {
      should.throws(() => parser.parse(['named', 'test']));
    });
  });

  describe('when parsing flags', () => {

    const parser = new ArgumentParser('test', {
      default: [
        {
          type: String,
          name: 'testDefault'
        }
      ],
      named: {
        named: {
          type: String,
          required: false
        }
      },
      flags: {
        flag1: {},
        flag2: {}
      }
    });

    it('and no flags are actually provided as parameters, Then the 2 flags have the value of false', () => {
      const result = parser.parse(['testValue']);

      should(result.flags).deepEqual({
        flag1: false,
        flag2: false
      });
    });

    it('and 1 out of 2 flags is provided as parameters, Then the specified flag has the value of true,' +
      'and the other one is false', () => {
      const result = parser.parse(['testValue', 'flag2']);

      should(result.flags).deepEqual({
        flag1: false,
        flag2: true
      });
    });


    it('and 2 out of 2 flags is provided as parameters, Then they both receive value true', () => {
      const result = parser.parse(['testValue', 'flag2', 'flag1']);

      should(result.flags).deepEqual({
        flag1: true,
        flag2: true
      });
    });

    it('and defining an invalid flag, then an error is thrown', () => {
      should.throws(() => parser.parse(['testValue', 'wrongFlag']));
    });

    it('when 2 flags are mutually exclusive, then specifying each one of them separately is fine,' +
      'but defining them both at once results in an error', () => {

      const mutuallyExclusiveParser = new ArgumentParser('test', {
        flags: {
          flag1: {
            exclusivityKey: 'onlyOne'
          },
          flag2: {
            exclusivityKey: 'onlyOne'
          }
        }
      });

      should(mutuallyExclusiveParser.parse(['flag1']).flags).deepEqual({
        flag1: true,
        flag2: false
      });
      should(mutuallyExclusiveParser.parse(['flag2']).flags).deepEqual({
        flag1: false,
        flag2: true
      });

      should.throws(() => mutuallyExclusiveParser.parse(['flag1', 'flag2']));
    });

  });

  describe('When defining the parameters in order other than default', () => {

    it('by defining the flags before the named parameters, Then the input is still correctly parsed', () => {
      const result = set.parse(['testKey', 'testValue', 'nx', 'ex', '2']);

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

  });

  describe('When parsing all possible parameter types', () => {

    const parser = new ArgumentParser('test', {
      default: [
        {
          name: 'key',
          type: String
        }
      ],
      named: {
        ex: {
          type: Number
        },
      },
      flags: {
        gt: {}
      },
      multiple: [
        {
          name: 'score',
          type: Number
        },
        {
          name: 'member',
          type: String
        }
      ]
    });

    it('And all values are provided, Then they are all successfully parsed', () => {
      const result = parser.parse(['testKey', 'gt', 'ex', '1', '1', 'one', '2', 'two']);

      result.should.deepEqual({
        default: {
          key: 'testKey'
        },
        named: {
          ex: 1
        },
        flags: {
          gt: true
        },
        multiple: [
          {
            score: 1,
            member: 'one'
          },
          {
            score: 2,
            member: 'two'
          }
        ]
      });
    });

    it('And all values except for the flag are provided, Then they are all successfully parsed', () => {
      const result = parser.parse(['testKey', 'ex', '1', '1', 'one', '2', 'two']);

      result.should.deepEqual({
        default: {
          key: 'testKey'
        },
        named: {
          ex: 1
        },
        flags: {
          gt: false
        },
        multiple: [
          {
            score: 1,
            member: 'one'
          },
          {
            score: 2,
            member: 'two'
          }
        ]
      });
    });

  });

});
