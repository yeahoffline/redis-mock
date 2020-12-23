redis-mock
============

[![NPM](https://nodei.co/npm/redis-mock.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/redis-mock/)

![Build status](https://github.com/yeahoffline/redis-mock/workflows/Build/badge.svg?branch=master)
![node-current](https://img.shields.io/node/v/redis-mock)
![mock-completeness](https://img.shields.io/badge/Methods%20mocked-46%25%20(222%2F482)-red)
[![GitHub issues](https://img.shields.io/github/issues/yeahoffline/redis-mock)](https://github.com/yeahoffline/redis-mock/issues)

The goal of the `redis-mock` project is to create a feature-complete mock of [node_redis](https://github.com/NodeRedis/node_redis), which may be used interchangeably when writing unit tests for code that depends on `redis`.

All operations are performed in-memory, so no Redis installation is required.

100% Redis-compatible (see [Cross Verification](#cross-verification))

# Installation

````bash
$ npm install redis-mock --save-dev
````


## Usage

### node.js/io.js

The below code demonstrates a example of using the redis-mock client in node.js/io.js


```js
var redis = require("redis-mock"),
    client = redis.createClient();
```


# API

Currently implemented are the following redis commands:

### General
* createClient
* duplicate
* auth
* end
* multi
  * exec
  * discard
  * exec_atomic
* batch

### Events
* ready
* connect
* end
* quit
* subscribe
* unsubscribe
* message
* psubscribe
* punsubscribe
* pmessage

### Publish/subscribe
* publish
* subscribe
* unsubscribe
* psubscribe
* punsubscribe

### Keys
* del
* keys
* scan
* exists
* type
* expire
* ttl
* incr
* incrby
* incrbyfloat
* decr
* decrby
* rename
* dbsize
* renamenx

### Strings
* get
* set
* append
* getset
* mget
* mset
* msetnx
* setex
* setnx
* ping

### Hashing
* hset
* hsetnx
* hget
* hexists
* hdel
* hlen
* hgetall
* hscan
* hmset
* hmget
* hkeys
* hvals
* hincrby
* hincrbyfloat

### Lists
* llen
* lpush
* rpush
* lpushx
* rpushx
* lpop
* rpop
* blpop
* brpop
* lindex
* lrange
* lrem
* lset

### Sets
* sadd
* srem
* smembers
* scard
* sismember
* sscan

### Sorted Sets
* zadd
* zcard
* zcount
* zincrby
* zrange
* zrangebyscore
* zrank
* zrem
* zremrangebyrank
* zremrangebyscore
* zrevrange
* zrevrangebyscore
* zrevrank
* zunionstore (Partial: no support for `WEIGHTS` or `AGGREGATE` yet)
* zinterstore (Partial: no support for `WEIGHTS` or `AGGREGATE` yet)
* zscore

### Server
* flushdb
* flushall
* time


# Cross verification

If you want to add new tests to the test base it is important that they work too on node_redis (we are creating a mock...).
You can therefore run the tests using `redis` instead of `redis-mock`. To do so:

````bash
$ npm test:valid
````

You will need to have a running instance of `redis` on you machine and our tests use flushdb a lot so make sure you don't have anything important on it.


# Roadmap
redis-mock is work in progress, feel free to report an issue

# Example usage

## Jest

In order to make sure that your tests use the `redis-mock` instead of the actual `redis` implementation,
update your `jest.config.js`, by adding `setupFileAfterEnv`, as follows:

```javascript
module.exports = {
    // other properties...
    setupFilesAfterEnv: ['./jest.setup.redis-mock.js'],
};
```

From this point on, jest will always trigger the content of `jest.setup.redis-mock.js` before the execution of all tests.

Now, let's create the file `jest.setup.redis-mock.js` in the same directory as `jest.config.js` and paste the following
content:

```javascript
jest.mock('redis', () => jest.requireActual('redis-mock'));
```

This will make sure that the actual `redis` is never loaded and whenever any file tries to import/require `redis`,
`redis-mock` will be returned instead.

## LICENSE - "MIT License"

Copyright (c) 2012 Kristian Faeldt <kristian.faeldt@gmail.com>

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
