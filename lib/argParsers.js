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
      }
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

};


