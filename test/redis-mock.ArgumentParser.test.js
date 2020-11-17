'use strict';

const should = require("should");
const {ArgumentParser} = require("../lib/ArgumentParser");


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
        }
      });
    });

    it('And only one of them is provided, Then that it is correctly parsed', () => {
      const result = parser.parse(['match', '*']);

      result.should.be.deepEqual({
        default: {},
        named: {
          match: '*'
        }
      });
    });

    it('And only one of them is provided, but is defined as a numeric string instead of number, Then that it is correctly parsed', () => {
      const result = parser.parse(['count', '5']);

      result.should.be.deepEqual({
        default: {},
        named: {
          count: 5
        }
      });
    });

    it('And only one of them is provided, but is defined as an abstract string instead of number, Then an error is thrown', () => {
      should.throws(() => parser.parse(['count', 'wrongValue']));
    });

    it('And neither one of them is provided, Then an empty object is returned by the parser', () => {
      const result = parser.parse([]);

      result.should.be.deepEqual({
        default: {},
        named: {}
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
        }
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
        named: {}
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
        }
      });
    });

    it('and the default argument is missing then the error is thrown', () => {
      should.throws(() => parser.parse([]));
    });

    it('and the default argument is missing, but a named argument is present, Then an error is thrown', () => {
      should.throws(() => parser.parse(['named', 'test']));
    });
  });

});
