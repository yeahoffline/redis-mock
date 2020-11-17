'use strict';

const {ReplyError} = require('redis');

/**
 * @typedef {Object} ArgumentDefinition
 * @property {*} type - the type of the property, like String or Number,
 * @property {boolean} [required = false] specifies if it's always mandatory for the argument to be present.
 *           If the required is `true` an error will be thrown during the parsing, should the argument not
 *           be specified.
 */

/**
 * @typedef {Object} DefaultArgument
 * @property {string} name - the name under which the value will be available after parsing
 * @property {*} type - the type of the property, like String or Number
 */

/**
 * Validates the definition during the initialization
 *
 * @param {ArgumentDefinition} definition to be validated
 */
const validateArgumentDefinition = definition => {
  if (typeof definition !== 'object') {
    throw new Error('Expected the argument definition to be an object');
  }

  if (definition.type !== Number && definition.type !== String) {
    throw new Error('Incorrect named argument definition. The type is missing or invalid');
  }
  if (typeof definition.required !== 'undefined' && typeof definition.required !== 'boolean') {
    throw new Error('Incorrect named argument definition. The required parameter is missing or invalid');
  }
};

/**
 * Validated default argument definition
 *
 * @param {DefaultArgument} definition to validate
 * @param {number} index the index of the definitions.default array that this definition is at
 */
const validateDefaultArgument = (definition, index) => {
  if (typeof definition.name !== 'string') {
    throw new Error('Incorrect default argument at position ' + index + '. Missing name property');
  }
  if (definition.type !== Number && definition.type !== String) {
    throw new Error('Incorrect default argument at position ' + index + '. Unsupported type');
  }
};

const validateDefinitions = definitions => {
  if (typeof definitions.default !== 'undefined') {
    if (!Array.isArray(definitions.default)) {
      throw new Error('Expected the default definitions to be an array');
    }
    definitions.default.forEach(validateDefaultArgument);
  }

  Object.keys(definitions.named).forEach(key => {
    const namedDefinition = definitions.named[key];
    validateArgumentDefinition(namedDefinition);
  });
};

/**
 * Helper class for argument parsing
 *
 * @type {ArgumentParser}
 */
module.exports.ArgumentParser = class {

  /**
   * Initializes the parser
   *
   * @param {string} commandName - the name of the command that the arguments of are being parsed over here.
   *        This is only used for error handling.
   * @param {object} definitions - argument definitions.
   * @param {Object.<string, ArgumentDefinition>} [definitions.named = {}]
   *        Named definitions and their types.
   *        For instance in the command `scan 0 match * count 100` there are 2 named
   *        arguments: match and count, that could be defined here as `{ match: string }`
   * @param {DefaultArgument[]} [definitions.default = []]. An array. For instance in the command
   *        `scan 0 match * count 100`, 0 is the default argument
   *
   * Each definition can have the
   */
  constructor(commandName, definitions) {
    validateDefinitions(definitions);

    this.definitions = {
      default: definitions.default || [],
      named: definitions.named || {}
    };

    this.commandName = commandName;

    this.hasNamedDefinitions = !!Object.keys(this.definitions).length;
  }

  /**
   * Cross-validates the arg value with the definition and parses it
   *
   * @param {string} argName name of the argument that the value of is being validated
   * @param {ArgumentDefinition} definition that the argument should be validated against
   * @param {*} arg argument that was provided by the user
   * @private
   * @return {*} a value of type specified in the definition
   * @throws {ReplyError} if the argument doesn't match the definition
   */
  _parseWithDefinition(argName, definition, arg) {
    if (definition.type === Number) {
      if (typeof arg === 'number') {
        return arg;
      }
      if (typeof arg === 'string') {
        const result = parseInt(arg, 10);
        if (isNaN(result)) {
          throw new ReplyError('Invalid value ' + arg + ' for argument ' + argName + ' in ' + this.commandName);
        }
        return result;
      }
    }
    if (definition.type === String) {
      return String(arg);
    }
  }

  /**
   * Cross-validates the argument name with the definition and normalizes it
   *
   * @param {string} argName the name provided by the user
   * @return {string} the normalised name of the argument
   * @private
   */
  _parseNamedArgName(argName) {
    const validationError = new ReplyError(
      'Expected ' + argName + ' to be one of the following ' + Object.keys(this.definitions.named).join(', ')
    );
    if (typeof argName !== 'string') {
      throw validationError;
    }

    const normalisedArgName = argName.toLowerCase();
    if (typeof this.definitions.named[normalisedArgName] === 'undefined') {
      throw validationError;
    }

    return normalisedArgName;
  }

  _validateAllRequiredArgsDefined(result) {
    Object.keys(this.definitions.named).forEach(name => {
      const definition = this.definitions.named[name];
      if (definition.required && typeof result.named[name] === 'undefined') {
        throw new ReplyError('The required argument "' + name + '" was not defined in the command ' + this.commandName);
      }
    });
  }

  _parseDefault(args) {
    const result = {};
    this.definitions.default.forEach((definition, index) => {
      result[definition.name] = this._parseWithDefinition('default', definition, args[index]);
    });
    return result;
  }

  /**
   * Parses an array of arguments
   *
   * @param {[]} args list of arguments to parse
   *
   * @returns {{
   *   default: *,
   *   named: *
   * }} a map of parameters and their values,
   * where the key represents the parameter name and the value is the argument value
   */
  parse(args) {
    const result = {
      default: this._parseDefault(args),
      named: {}
    };

    let index = this.definitions.default.length;

    if (this.hasNamedDefinitions) {
      for (; index < args.length; index += 2) {
        const argName = this._parseNamedArgName(args[index]);
        result.named[argName] = this._parseWithDefinition(args[index], this.definitions.named[argName], args[index + 1]);
      }
    }

    if (index !== args.length) {
      throw new ReplyError('Failed to parse arguments for the command ' + this.commandName);
    }

    this._validateAllRequiredArgsDefined(result);

    return result;
  }

};
