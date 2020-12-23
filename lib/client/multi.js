const helpers = require('../helpers');

class Multi {

  constructor(client) {
    this._client = client;
    this._commands = [];
    this._results = [];
    this._errors = [];
    this._discarded = false;
    this._callbacks = [];
    this._batch = false;
  }

  get _selectedDb() {
    return this._client._selectedDb;
  }

  get _redisMock() {
    return this._client._redisMock;
  }

  /**
   * Add a new command to the queue
   */
  _command(name, argList) {
    const index = this._commands.length;

    let callBack;
    let args = argList;

    const lastArg = args[args.length -1];
    if(typeof lastArg === 'function') {
      callBack = lastArg;
      args = args.slice(0, args.length-1);
    }

    // Add a custom callback that chains the next commands,
    // or to terminate the queue.
    const command = args.concat((err, result) => {
      if(callBack) {
        this._callbacks.push(() => {
          callBack(err, result);
          if (this._callbacks.length !== 0) {
            helpers.callCallback(this._callbacks.shift());
          }
        });
      }

      this._errors[index] = err;
      this._results[index] = result;

      const nextIndex = index + 1;

      if (this._commands.length === nextIndex) {
        this._callbacks.push(() => {
          this._done();
        });
        helpers.callCallback(this._callbacks.shift());
      } else {
        const next = () => {
          this._commands[nextIndex]();
        };
        helpers.callCallback(next);
      }
    });

    this._commands.push(() => {
      this._client[name].apply(this, command);
    });
  }

  /**
   * called when all commands in the queue are finished
   */
  _done() {
    const callBack = this._doneCallback;
    if (callBack) {
      var errs = this._errors.filter(function (err) {
        return err !== null;
      });

      if (errs.length === 0) {
        errs = null;
      }

      callBack(errs, this._results);
    }
  }

  _runExec(callback) {
    this._doneCallback = callback;
    if (this._discarded) {
      const err = new Error('ERR EXEC without MULTI');
      // In batch mode errors are propagated in values
      if (this._batch) {
        helpers.callCallback(callback, null, [err]);
      } else {
        helpers.callCallback(callback, err);
      }
    } else {
      if (!this._commands.length) {
        helpers.callCallback(callback, null, []);
      } else {
        this._commands[0]();
      }
    }
    return this;
  }

  /**
   * starts running all commands in the queue
   */
  exec(callback) {
    this._runExec(callback);
  }

  /**
   * starts running all commands in the queue
   */
  exec_atomic(callback) {
    this._runExec(callback);
  }


  /**
   * discards the queue
   */
  discard(callback) {
    this._doneCallback = callback;
    this._commands.length = 0;
    this._discarded = true;
    return this;
  }
}

const multi = function (client, commands, isBatch) {
  const result = new Multi(client);
  result._batch = isBatch;
  if(commands) {
    commands.forEach((command) => {
      result._command(command[0], command.slice(1));
    });
  }
  return result;
};

module.exports.multi = multi;
module.exports.Multi = Multi;
