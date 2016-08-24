var redismock = require("../");
var should = require("should");
var events = require("events");

if (process.env['VALID_TESTS']) {
  redismock = require('redis');
}

describe("publish and subscribe", function () {

  it("should subscribe and unsubscribe to a channel", function (done) {

    var r = redismock.createClient();

    should.exist(r.subscribe);
    should.exist(r.unsubscribe);

    var channelName = "testchannel";

    r.on("subscribe", function (ch) {

      should.equal(ch, channelName);
      r.unsubscribe("testchannel");
    });

    r.on("unsubscribe", function (ch) {

      should.equal(ch, channelName);

      r.end(true);

      done();
    });

    r.subscribe(channelName);
  });

  it("should psubscribe and punsubscribe to a channel", function (done) {
    var r = redismock.createClient();
    var channelName = "testchannel";

    should.exist(r.psubscribe);
    should.exist(r.punsubscribe);

    r.on("psubscribe", function (ch) {
      should.equal(ch, channelName);
      r.punsubscribe("testchannel");
    });

    r.on("punsubscribe", function (ch) {
      should.equal(ch, channelName);
      r.end(true);
      done();
    });
    r.psubscribe(channelName);
  });

  it("suscribing and publishing with the same connection should make an error", function (done) {
    var channelName = "testchannel";
    var otherChannel = "otherchannel";

    var r = redismock.createClient();
    r.subscribe(channelName);

    try {
      (function () {
        r.publish(otherChannel, "");
      }).should.throwError();
    } catch (e) {
      r.end(true);

      done();
    }
  });

  it("psuscribing and publishing with the same connection should make an error", function (done) {
    var channelName = "testchannel";
    var otherChannel = "otherchannel";

    var r = redismock.createClient();
    r.psubscribe(channelName);

    try {
      (function () {
        r.publish(otherChannel, "");
      }).should.throwError();
    } catch (e) {
      r.end(true);

      done();
    }
  });

  it("should only receive message on channels subscribed to", function (done) {

    var channelName = "testchannel";
    var otherChannel = "otherchannel";

    var r = redismock.createClient();
    var r2 = redismock.createClient();
    r.subscribe(channelName);

    r.on('message', function (ch, msg) {
      ch.should.equal(channelName);

      r.unsubscribe(channelName);

      r.end(true);

      done();
    });

    r2.publish(otherChannel, "");
    setTimeout(function () {
      r2.publish(channelName, "");
    }, 1000);
  });

  it("should only receive message on channels psubscribed to", function (done) {
    var pattern = "h*llo\\*";
    var goodChannels = ["hllo*", "hello*", "heello*"];
    var badChannels = ["hllo", "hall", "hello*o"];
    var index = 0;
    var r = redismock.createClient();
    var r2 = redismock.createClient();

    r.psubscribe(pattern);
    r.on('pmessage', function (pattern, ch, msg) {
      ch.should.equal(ch);
      msg.should.equal(goodChannels[index]);
      index++;
      if(index === goodChannels.length) {
        r.punsubscribe(pattern);
        r.end(true);
        done();
      }
    });

    badChannels.forEach(function (channelName) { r2.publish(channelName, channelName); });
    goodChannels.forEach(function (channelName) { r2.publish(channelName, channelName); });
  });

  it("should support multiple subscribers", function (done) {

    var channelName = "testchannel";
    var doneChannel = "donechannel";

    var r = redismock.createClient();
    var r2 = redismock.createClient();
    var r3 = redismock.createClient();

    r.subscribe(channelName);
    r2.subscribe(channelName);
    r2.subscribe(doneChannel);

    var channelNameCallsRecieved = 0;

    r.on('message', function (ch, msg) {

      ch.should.equal(channelName);
      channelNameCallsRecieved++;

    });

    r2.on('message', function (ch, msg) {

      if (ch == channelName) {
        channelNameCallsRecieved++;
      } else if (ch == doneChannel) {

        channelNameCallsRecieved.should.equal(4);
        r.unsubscribe(channelName);
        r2.unsubscribe(channelName);
        r2.unsubscribe(doneChannel);

        r.end(true);
        r2.end(true);

        done();
      }
    });
    // Ensure the messages has got time to get to the server
    setTimeout(function () {
      r3.publish(channelName, "");
      r3.publish(channelName, "");
      setTimeout(function () {
        r3.publish(doneChannel, "");
      }, 500);
    }, 500);
  });

  it("should support multiple psubscribers", function (done) {

    var channelName = "testchannel";
    var doneChannel = "donechannel";

    var r = redismock.createClient();
    var r2 = redismock.createClient();
    var r3 = redismock.createClient();

    r.psubscribe(channelName);
    r2.psubscribe(channelName);
    r2.psubscribe(doneChannel);

    var channelNameCallsRecieved = 0;

    r.on('pmessage', function (pattern, ch, msg) {
      ch.should.equal(channelName);
      channelNameCallsRecieved++;
    });

    r2.on('pmessage', function (pattern, ch, msg) {
      if (ch == channelName) {
        channelNameCallsRecieved++;
      } else if (ch == doneChannel) {
        channelNameCallsRecieved.should.equal(4);
        r.punsubscribe(channelName);
        r2.punsubscribe(channelName);
        r2.punsubscribe(doneChannel);

        r.end(true);
        r2.end(true);
        done();
      }
    });
    // Ensure the messages has got time to get to the server
    setTimeout(function () {
      r3.publish(channelName, "");
      r3.publish(channelName, "");
      setTimeout(function () {
        r3.publish(doneChannel, "");
      }, 100);
    }, 100);
  });
});
