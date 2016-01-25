redis-mock
============

[![NPM](https://nodei.co/npm/redis-mock.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/redis-mock/)

[![Build Status](https://travis-ci.org/yeahoffline/redis-mock.svg?branch=master)](https://travis-ci.org/yeahoffline/redis-mock)
[![Coverage Status](https://coveralls.io/repos/yeahoffline/redis-mock/badge.svg)](https://coveralls.io/r/yeahoffline/redis-mock)

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
* auth
* end

### Events
* ready
* connect
* end
* quit
* subscribe
* unsubscribe
* message

### Publish/subscribe
* publish
* subscribe
* unsubscribe

### Keys
* del
* keys
* exists
* expire
* ttl
* incr
* incrby
* incrbyfloat

### Strings
* get
* set
* getset
* mget
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
* hmset
* hmget
* hkeys
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
* lset

### Sets
* sadd
* srem
* smembers
* scard

### Server
* flushdb
* flushall




# Cross verification

If you want to add new tests to the test base it is important that they work too on node_redis (we are creating a mock...).
You can therefore run the tests using `redis` instead of `redis-mock`. To do so:

````bash
$ make check-tests
````


You will need to have a running instance of `redis` on you machine and our tests use flushdb a lot so make sure you don't have anything important on it.


# Roadmap
redis-mock is work in progress, feel free to report an issue


# Versions
* 0.5.1 setex bug + readme update (thanks to gswalden)
* 0.5.0 "Add an AUTH method" + other pr (thanks to aredridel)
* 0.4.9 merge getset + expire fix (thanks to sobotklp)
* 0.4.8 merge issue #1 (thanks to williamkapke)
* 0.4.7 update devDependencies (should, mocha)




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
