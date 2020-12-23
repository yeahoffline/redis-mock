'use strict';

const helpers = require("../helpers");
const should = require("should");

describe("select", () => {

  describe('When selecting the db through the select() call', () => {

    const r = helpers.createClient();
    afterEach((done) => r.flushall(done));
    after((done) => r.quit(done));

    it('Then the previously specified keys should not be visible', (done) => {
      r.set('testKey', 'testValue', () => {
        r.get('testKey', (err, result) => {
          result.should.equal('testValue');
          r.select(1, () => {
            r.get('testKey', (err, result) => {
              should(result).be.null();
              r.select(0, () => {
                r.get('testKey', (err, result) => {
                  result.should.equal('testValue');
                  done();
                });
              });
            });
          });
        });
      });
    });

    it("should change database with using an integer", function(done) {
      r.select(2, function(err, result) {
        should.not.exist(err);
        result.should.equal('OK');

        done();
      });

    });

    it('should error when using and invalid database value', function(done) {
      r.select('db', function(err, result) {
        should.not.exist(result);
        should(err).Error;

        done();
      });
    });

    it('should error when using and invalid database index', function(done) {
      r.select(1000, function(err, result) {
        should.not.exist(result);
        should(err).Error;

        done();
      });
    });

    it('should not ensist on a callback', function() {
      r.select(3);
    });
  });

  describe('When selecting the db through the options', () => {
    let c1;
    let c2;

    beforeEach(() => {
      c1 = helpers.createClient({db: 1});
      c2 = helpers.createClient({db: 2});
    });

    afterEach((done) => {
      c1.quit(() =>  c2.quit(done));
    });

    it('When 2 clients point to the same redis instance, but 2 different dbs, Then they do not see each other\'s keys', (done) => {
      c1.set('testKey', 'testValue', () => {
        c1.get('testKey', (err, result) => {
          result.should.equal('testValue');
          c2.get('testKey', (err, result) => {
            should(result).be.null();
            done();
          });
        });
      });
    });
  });

  describe('When selecting the db through the url', () => {
    let c1;
    let c2;

    beforeEach(() => {
      c1 = helpers.createClient('redis://localhost:6379');
      c2 = helpers.createClient('redis://localhost:6379?db=2');
    });

    afterEach((done) => {
      c1.flushall(() => c2.flushall(() => c1.quit(() => c2.quit(done))));
    });

    it('When 2 clients point to the same redis instance, but 2 different dbs, Then they do not see each other\'s keys', (done) => {
      c1.set('testKey', 'testValue', () => {
        c1.get('testKey', (err, result) => {
          result.should.equal('testValue');
          c2.get('testKey', (err, result) => {
            should(result).be.null();
            done();
          });
        });
      });
    });
  });

  describe('With 2 clients', () => {

    let subscriber;
    let publisher;

    beforeEach(() => {
      subscriber = helpers.createClient({db: 1});
      publisher = helpers.createClient({db: 2});
    });

    afterEach((done) => {
      subscriber.flushall(() => publisher.flushall(() => subscriber.quit(() => publisher.quit(done))));
    });

    it('When publishing, Then the subscribers on the same db are notified', (done) => {
      subscriber.select('1', () => {
        subscriber.on('message', (channel, msg) => {
          channel.should.equal('test');
          msg.should.equal('test message');
          done();
        });

        subscriber.subscribe('test');
        publisher.publish('test', 'test message');
      });
    });

    it('When publishing on a different db, Then the subscribers are still notified', (done) => {
      subscriber.on('message', (channel, msg) => {
        channel.should.equal('test');
        msg.should.equal('test message');
        done();
      });

      subscriber.subscribe('test');
      publisher.publish('test', 'test message');
    });
  });

});
