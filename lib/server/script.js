'use strict';

const { ReplyError } = require('../errors');

const scripts = {
  debug: (args) => {
    if (args.length !== 1) {
      throw new ReplyError('ERR Unknown subcommand or wrong number of arguments for \'DEBUG\'. Try SCRIPT HELP.');
    }
    const param = args[0].toLowerCase();
    if (param !== 'yes' && param !== 'no' && param !== 'sync') {
      throw new ReplyError('ERR Use SCRIPT DEBUG yes/sync/no');
    }
    return 'OK';
  }
};

module.exports.script = function(command, ...args) {
  const script = scripts[command.toLowerCase()];
  if (!script) {
    throw new ReplyError('ERR Unknown subcommand or wrong number of arguments for \'' + command + '\'. Try SCRIPT HELP.');
  }
  return script(args);
};
