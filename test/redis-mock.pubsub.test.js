var should = require("should");
var events = require("events");
var helpers = require("./helpers");

describe("publish and subscribe", function () {

  it("should subscribe and unsubscribe to a channel", function (done) {

    var r = helpers.createClient();

    should.exist(r.subscribe);
    should.exist(r.unsubscribe);

    var channelName = "testchannel";

    r.on("subscribe", function (ch) {

      should.equal(ch, channelName);
      r.unsubscribe("testchannel");
    });

    r.on("unsubscribe", function (ch) {

      should.equal(ch, channelName);

      r.quit(done);

    });

    r.subscribe(channelName);
  });

  it("should unsubscribe to all channels if no arguments are given", function (done) {

    var r = helpers.createClient();

    should.exist(r.subscribe);
    should.exist(r.unsubscribe);

    var channelNames = ["firstchannel", "secondchannel"];
    var channelsSubscribed = 0;
    var channelsUnsubscribed = 0;

    r.on("subscribe", function (ch) {
      channelsSubscribed++;

      if (channelsSubscribed == channelNames.length) {
        r.unsubscribe();
      }
    });

    r.on("unsubscribe", function (ch) {
      channelsUnsubscribed++;
      if (channelsUnsubscribed == channelNames.length) {
        r.quit(done);
      }
    });

    r.subscribe(channelNames[0]);
    r.subscribe(channelNames[1]);
  });

  it("should psubscribe and punsubscribe to a channel", function (done) {
    var r = helpers.createClient();
    var channelName = "testchannel";

    should.exist(r.psubscribe);
    should.exist(r.punsubscribe);

    r.on("psubscribe", function (ch) {
      should.equal(ch, channelName);
      r.punsubscribe("testchannel");
    });

    r.on("punsubscribe", function (ch) {
      should.equal(ch, channelName);
      r.quit(done);
    });
    r.psubscribe(channelName);
  });

  it("suscribing and publishing with the same connection should make an error", function (done) {
    var channelName = "testchannel";
    var otherChannel = "otherchannel";

    var r = helpers.createClient();
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

    var r = helpers.createClient();
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

    var r = helpers.createClient();
    var r2 = helpers.createClient();
    r.subscribe(channelName);

    r.on('message', function (ch, msg) {
      ch.should.equal(channelName);

      r.unsubscribe(channelName);

      r.quit(done);

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
    var messages = ["msg1", "msg2", "msg3"]
    var index = 0;
    var r = helpers.createClient();
    var r2 = helpers.createClient();

    r.on('pmessage', function (pattern, ch, msg) {
      ch.should.equal(goodChannels[index]);
      msg.should.equal(messages[index]);
      index++;
      if(index === goodChannels.length) {
        r.punsubscribe(pattern);
        r.quit(done);
      }
    });

    r.psubscribe(pattern);

    // Wait for redis to register the subscription
    setTimeout(function() {
      badChannels.forEach(function (channelName, i) {
        r2.publish(channelName, messages[i]);
      });

      goodChannels.forEach(function (channelName, i) {
        r2.publish(channelName, messages[i]);
      });
    }, 50);

  });

  it("should support multiple subscribers", function (done) {

    var channelName = "testchannel";
    var doneChannel = "donechannel";

    var r = helpers.createClient();
    var r2 = helpers.createClient();
    var r3 = helpers.createClient();

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

        r.quit(function (err) {
          if (err) {
            should.fail(err, null, "Expected null error.", "");
          }
          r2.quit(done);
        })
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

    var r = helpers.createClient();
    var r2 = helpers.createClient();
    var r3 = helpers.createClient();

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

        r.quit(function (err) {
          if (err) {
            should.fail(err, null, "Expected null error.", "");
          }
          r2.quit(done);
        })
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
