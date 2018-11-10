/**
 * Subscribe
 *
 * TODO: Verify how multiple channel subscription works in actual Redis
 *   Optional callback?
 *
 */

var patternToRegex = require('./helpers').patternToRegex;

exports.subscribe = function () {

  var self = this;

  if (!arguments.length) {
    return;
  }

  this.pub_sub_mode = true;

  for (var i = 0; i < arguments.length; i++) {

    if ('string' == typeof arguments[i]) {

      // Event on next tick to emulate an actual server call
      var channelName = arguments[i];
      process.nextTick(function () {
        self.subscriptions[channelName] = true;
        // TODO Should also send length of subscriptions here
        self.emit('subscribe', channelName);
      });
    }
  }
}

/**
 * pSubscribe
 */
exports.psubscribe = function () {
  var self = this;
  if (!arguments.length) {
    return;
  }
  this.pub_sub_mode = true;

  for (var i = 0; i < arguments.length; i++) {
    if ('string' == typeof arguments[i]) {
      // Event on next tick to emulate an actual server call
      var channelName = arguments[i];
      process.nextTick(function () {
        self.psubscriptions[channelName] = patternToRegex(channelName);
        self.emit('psubscribe', channelName);
      });
    }
  }
}
/**
 * Unsubscribe
 */
exports.unsubscribe = function () {

  var self = this
    , subcriptions = arguments;

  if (!arguments.length) {
    subcriptions = Object.keys(self.subscriptions).map(function (subscription) {
      return subscription;
    })
  }

  for (var i = 0; i < subcriptions.length; i++) {

    if ('string' == typeof subcriptions[i]) {

      // Event on next tick to emulate an actual server call
      var channelName = subcriptions[i];
      process.nextTick((function(channelName) {
        return function () {
          self.subscriptions[channelName] = false;
          delete self.subscriptions[channelName];
          self.emit('unsubscribe', channelName);
        }
      })(channelName));
    }
  }

  // TODO: If this was the last subscription, pub_sub_mode should be set to false
  this.pub_sub_mode = false;
}

/**
 * punsubscribe
 */
exports.punsubscribe = function () {
  var self = this
    , subcriptions = arguments;

  // Unsubscribe from ALL channels
  if (!arguments.length) {
    subcriptions = Object.keys(self.psubscriptions);
    this.pub_sub_mode = false;
  }

  for (var i = 0; i < subcriptions.length; i++) {
    if ('string' == typeof arguments[i]) {
      // Event on next tick to emulate an actual server call
      var channelName = arguments[i];
      process.nextTick(function () {
        delete self.psubscriptions[channelName];
        self.emit('punsubscribe', channelName);
      });
    }
  }
  // TODO: If this was the last subscription, pub_sub_mode should be set to false
}

/**
 * Publish
 */
exports.publish = function (mockInstance, channel, msg) {

  this.pub_sub_mode = true;
  process.nextTick(function () {
    if ((typeof msg == "object") && (msg !== null)) {
      msg = JSON.stringify(msg);
    }
    mockInstance.emit('message', channel, msg);
  });
}
