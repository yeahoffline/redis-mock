'use strict';

const { ArgumentParser } = require('./ArgumentParser');

module.exports = {

  scan: new ArgumentParser('SCAN', {
    default: [
      {
        name: 'cursor',
        type: Number
      }
    ],
    named: {
      match: {
        type: String
      },
      count: {
        type: Number
      },
    }
  }),

  sscan: new ArgumentParser('SSCAN', {
    default: [
      {
        name: 'key',
        type: String
      },
      {
        name: 'cursor',
        type: Number
      }
    ],
    named: {
      match: {
        type: String
      },
      count: {
        type: Number
      }
    }
  }),

  set: new ArgumentParser('SET', {
    default: [
      {
        name: 'key',
        type: String
      },
      {
        name: 'value',
        type: [String, Buffer]
      }
    ],
    named: {
      ex: {
        type: Number,
        exclusivityKey: 'time'
      },
      px: {
        type: Number,
        exclusivityKey: 'time'
      }
    },
    flags: {
      keepttl: {
        exclusivityKey: 'time'
      },
      nx: {
        exclusivityKey: 'setting'
      },
      xx: {
        exclusivityKey: 'setting'
      }
    }
  }),

  zadd: new ArgumentParser('ZADD', {
    default: [
      {
        name: 'key',
        type: String
      }
    ],
    flags: {
      gt: {
        exclusivityKey: 'comparison'
      },
      lt: {
        exclusivityKey: 'comparison'
      },
      nx: {
        exclusivityKey: 'setting'
      },
      xx: {
        exclusivityKey: 'setting'
      },
      ch: {},
      incr: {}
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
  }),

  append: new ArgumentParser('APPEND', {
    default: [
      {
        name: 'key',
        type: String
      },
      {
        name: 'value',
        type: String
      }
    ]
  }),

};


