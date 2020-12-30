'use strict';

const { createClient, ReplyError } = require('../helpers');
const should = require('should');

describe('Given the script command', () => {

  let redis;

  beforeEach(() => {
    redis = createClient();
  });

  afterEach((done) => {
    redis.flushall(() => {
      done();
    });
  });

  it('When called without any parameters, Then an error should be thrown', (done) => {
    redis.script((err, res) => {
      should(res).be.undefined();
      should(err instanceof ReplyError).equal(true);
      err.message.toLowerCase().should.equal('err wrong number of arguments for \'script\' command');
      done();
    });
  });

  it('When unsupported command is used, Then an error should be thrown', (done) => {
    redis.script('invalidCommand', (err, res) => {
      should(res).be.undefined();
      should(err instanceof ReplyError).equal(true);
      err.message.should.equal('ERR Unknown subcommand or wrong number of arguments for \'invalidCommand\'. Try SCRIPT HELP.');
      done();
    });
  });

  describe('When calling SCRIPT DEBUG', () => {

    after((done) => {
      redis.script('debug', 'no', (err) => {
        done(err);
      });
    });

    it('YES, then for mock it is ignored', (done) => {
      redis.script('DEBUG', 'YES', (err, res) => {
        should(err).be.null();
        res.should.equal('OK');
        done();
      });
    });

    it('NO, then for mock it is ignored', (done) => {
      redis.script('DEBUG', 'NO', (err, res) => {
        should(err).be.null();
        res.should.equal('OK');
        done();
      });
    });

    it('SYNC, then for mock it is ignored', (done) => {
      redis.script('DEBUG', 'SYNC', (err, res) => {
        should(err).be.null();
        res.should.equal('OK');
        done();
      });
    });

    it('then an error is thrown', (done) => {
      redis.script('DEBUG', (err, res) => {
        should(res).be.undefined();
        should(err instanceof ReplyError).equal(true);
        err.message.should.equal('ERR Unknown subcommand or wrong number of arguments for \'DEBUG\'. Try SCRIPT HELP.');
        done();
      });
    });

    it('SYNC NO, then an error is thrown', (done) => {
      redis.script('DEBUG', 'yes', 'no', (err, res) => {
        should(res).be.undefined();
        should(err instanceof ReplyError).equal(true);
        err.message.should.equal('ERR Unknown subcommand or wrong number of arguments for \'DEBUG\'. Try SCRIPT HELP.');
        done();
      });
    });

    it('INVALID, then an error is returned', (done) => {
      redis.script('DEBUG', 'INVALID', (err, res) => {
        should(res).be.undefined();
        should(err instanceof ReplyError).equal(true);
        err.message.should.equal('ERR Use SCRIPT DEBUG yes/sync/no');
        done();
      });
    });

  });
});
