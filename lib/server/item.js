const util = require('util');

/**
 * Transforms the argument to a string
 */
const stringify = function (value) {
  return typeof(value) === "object" ?
    JSON.stringify(value) :
    value + '';
};

/**
 * Constructor of the main class RedisItem
 */
const RedisItem = function (type, expire) {
  // We keep type so we don't have to use instanceof maybe this
  // can be changed to something more clever
  this.type = type || 0;
  this.expires = expire || -1;
};

/**
 * Constructor of a string
 */
const RedisString = function (value, expires) {
  RedisItem.call(this, "string", expires);
  this.value = String(value);
};
util.inherits(RedisString, RedisItem);

/**
 * Constructor of a buffer
 */
const RedisBuffer = function (value, expires) {
  RedisItem.call(this, "buffer", expires);
  this.value = (value instanceof Buffer) ? value : new Buffer(value);
};
util.inherits(RedisBuffer, RedisItem);

/**
 * Constructor of an hash
 */
const RedisHash = function () {
  RedisItem.call(this, "hash");
  this.value = {};
};
util.inherits(RedisHash, RedisItem);


const RedisList = function () {
  RedisItem.call(this, "list");
  this.value = [];
};
util.inherits(RedisList, RedisItem);

RedisList.prototype.rpush = function (values) {
  for (var i = 0; i < values.length; i++) {
    this.value.push(stringify(values[i]));
  }
};

RedisList.prototype.lpush = function (values) {
  for (var i = 0; i < values.length; i++) {
    this.value.unshift(stringify(values[i]));
  }
};

RedisList.prototype.rpop = function (value) {
  return this.value.pop();
};

RedisList.prototype.lpop = function (value) {
  return this.value.shift();
};

/**
 * Constructor of a set
 */
var RedisSet = function () {
  RedisItem.call(this, "set");
  this.value = [];
};
util.inherits(RedisSet, RedisItem);

/**
 * Constructor of a sortedset
 */
const RedisSortedSet = function () {
  RedisItem.call(this, "zset");
  this.value = {};
};
util.inherits(RedisSortedSet, RedisItem);

var RedisItemFactory = {
  _item: RedisItem,
  _string: RedisString,
  _buffer: RedisBuffer,
  _hash: RedisHash,
  _list: RedisList,
  _set: RedisSet,
  _sortedset: RedisSortedSet,
  _stringify: stringify
};

RedisItemFactory.createString = function (elt, expire) {
  return new RedisString(elt, expire);
};

RedisItemFactory.createBuffer = function (elt, expire) {
  return new RedisBuffer(elt, expire);
};

RedisItemFactory.createHash = function () {
  return new RedisHash();
};

RedisItemFactory.createList = function () {
  return new RedisList();
};

RedisItemFactory.createSet = function () {
  return new RedisSet();
};

RedisItemFactory.createSortedSet = function () {
  return new RedisSortedSet();
};

/**
 * Export the constructor
 */
module.exports = exports = RedisItemFactory;
