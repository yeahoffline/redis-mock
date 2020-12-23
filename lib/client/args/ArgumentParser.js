'use strict';

const { Buffer } = require('buffer');
const { ReplyError } = require('../../errors');

/**
 * We have to be compatible with node version 6.
 * It looks like version 6 still didn't have Object.values()
 */
const objectValues = (obj) => Object.keys(obj).map((key) => obj[key]);

/**
 * @typedef {Object} ArgumentDefinition
 * @property {*} type - the type of the property, like String or Number,
 * @property {boolean} [required = false] specifies if it's always mandatory for the argument to be present.
 *           If the required is `true` an error will be thrown during the parsing, should the argument not
 *           be specified.
 * @property {string} exclusivityKey - if same key specified on more than 1 argument, only one of them can be specified
 */

/**
 * @typedef {Object} DefaultArgument
 * @property {string} name - the name under which the value will be available after parsing
 * @property {*} type - the type of the property, like String or Number
 */

/**
 * @typedef {Object} Flag
 * @property {string} exclusivityKey - if same key specified on more than 1 argument, only one of them can be specified
 */

const flat = (arr) => arr.reduce((acc, e) => acc.concat(e), []);

const supportedDefaultTypes = [Number, String, Buffer];

/**
 * Validates the definition during the initialization
 *
 * @param {ArgumentDefinition} definition to be validated
 */
const validateArgumentDefinition = (definition) => {
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

  if (
    !(Array.isArray(definition.type) && definition.type.every((type) => supportedDefaultTypes.includes(type)))
    && !supportedDefaultTypes.includes(definition.type)
  ) {
    throw new Error('Incorrect default argument at position ' + index + '. Unsupported type');
  }
};

const validateFlagDefinition = (commandName, definition) => {
  if (typeof definition.exclusivityKey !== 'undefined' && typeof definition.exclusivityKey !== 'string') {
    throw new Error('The exclusivityKey of ' + definition.name + 'flag is an optional parameter, but once specified, should be of type "string"');
  }
};

const validateFlagDefinitions = (commandName, definitions) => {
  if (typeof definitions !== 'object') {
    throw new Error('Expected the flag definition to be an object on command ' + commandName);
  }
  objectValues(definitions).forEach((flagDefinition) => validateFlagDefinition(commandName, flagDefinition));
};

const getAllExclusivityKeys = (definitions) => {
  const result = new Set();
  objectValues(definitions.flags || {}).forEach((flagDefinition) => {
    if (flagDefinition.exclusivityKey) {
      result.add(flagDefinition.exclusivityKey);
    }
  });

  objectValues(definitions.named || {}).forEach((namedDefinition) => {
    if (namedDefinition.exclusivityKey) {
      result.add(namedDefinition.exclusivityKey);
    }
  });

  return Array.from(result);
};

const validateExclusivityKeyDefinitions = (commandName, definitions) => {
  const exclusivityKeyUsages = getAllExclusivityKeys(definitions).reduce((acc, key) => {
    if (!acc[key]) {
      acc[key] = [];
    }

    Object.keys(definitions.flags || {}).forEach((flagName) => {
      const flagDefinition = definitions.flags[flagName];
      if (key === flagDefinition.exclusivityKey) {
        acc[key].push(flagDefinition.name);
      }
    });
    Object.keys(definitions.named || {}).forEach((namedDefinitionName) => {
      const namedDefinition = definitions.named[namedDefinitionName];
      if (namedDefinition.exclusivityKey === key) {
        acc[key].push(namedDefinitionName);
      }
    });

    return acc;
  }, {});

  Object.keys(exclusivityKeyUsages).forEach((exclusivityKey) => {
    const usages = exclusivityKeyUsages[exclusivityKey];
    if (usages.length < 2) {
      throw new Error('"exclusivityKey" should not be used if applies to only 1 property. Found: ' + exclusivityKey + ' on ' + usages[0].name);
    }
  });
};

const validateDefinitions = (commandName, definitions) => {
  if (typeof definitions.default !== 'undefined') {
    if (!Array.isArray(definitions.default)) {
      throw new Error('Expected the default definitions to be an array on command ' + commandName);
    }
    definitions.default.forEach(validateDefaultArgument);
  }

  if (typeof definitions.named !== 'undefined') {
    Object.keys(definitions.named).forEach((key) => {
      const namedDefinition = definitions.named[key];
      validateArgumentDefinition(namedDefinition);
    });
  }

  if (typeof definitions.flags !== 'undefined') {
    validateFlagDefinitions(commandName, definitions.flags);
  }

  validateExclusivityKeyDefinitions(commandName, definitions);
};

const buildInterchangeableOrderDefinitions = (named, flags) => {
  const result = {};

  Object.keys(named).forEach((name) => {
    result[name] = named[name];
    result[name].isNamed = true;
  });

  Object.keys(flags).forEach((name) => {
    result[name] = flags[name];
    result[name].isFlag = true;
  });

  return result;
};

/**
 * Helper class for argument parsing
 *
 * @type {ArgumentParser}
 */
module.exports.ArgumentParser = class ArgumentParser {

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
   * @param {Object.<String, Flag>} [definitions.flags = {}]
   * @param {DefaultArgument[]} [definitions.default = []]. An array. For instance in the command
   *        `scan 0 match * count 100`, 0 is the default argument
   *
   * Each definition can have the
   */
  constructor(commandName, definitions) {
    validateDefinitions(commandName, definitions);

    this.definitions = {
      default: definitions.default || [],
      named: definitions.named || {},
      flags: definitions.flags || {},
      interchangeableOrderDefinitions: buildInterchangeableOrderDefinitions(
        definitions.named || {},
        definitions.flags || {}
      ),
      multiple: definitions.multiple
    };

    this.commandName = commandName;
    this._allExclusivityKeys = getAllExclusivityKeys(this.definitions);
  }

  /**
   * Cross-validates the arg value with the definition and parses it
   *
   * @param {string} argName name of the argument that the value of is being validated
   * @param {ArgumentDefinition} definition that the argument should be validated against
   * @param {*} arg argument that was provided by the user
   * @private
   * @return {*} a value of type specified in the definition
   * @throws {Error} if the argument doesn't match the definition
   */
  _parseWithDefinition(argName, definition, arg) {
    const acceptableTypes = [].concat(definition.type);

    if (arg instanceof Buffer && acceptableTypes.includes(Buffer)) {
      return arg;
    }
    if (typeof arg === 'number' && acceptableTypes.includes(Number)) {
      return arg;
    }
    if (typeof arg === 'string' && acceptableTypes.includes(Number)) {
      const result = parseFloat(arg);
      if (isNaN(result)) {
        throw new Error('Invalid value ' + arg + ' for argument ' + argName + ' in ' + this.commandName + '. Expected a number');
      }
      return result;
    }
    if (typeof arg === 'string' && acceptableTypes.includes(String)) {
      return arg;
    }
    if (typeof arg === 'number' && acceptableTypes.includes(String)) {
      return String(arg);
    }

    throw new Error(
      'Invalid value ' + arg + ' for argument ' + argName + ' in ' + this.commandName
      + 'Expected [' + acceptableTypes.join(', ') + ']'
    );
  }

  _validateAllRequiredArgsDefined(result) {
    Object.keys(this.definitions.named).forEach((name) => {
      const definition = this.definitions.named[name];
      if (definition.required && typeof result.named[name] === 'undefined') {
        throw new Error('The required argument "' + name + '" was not defined in the command ' + this.commandName);
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

  _getAllFlagsAsFalse() {
    return Object.keys(this.definitions.flags).reduce((acc, flagName) => {
      acc[flagName] = false;
      return acc;
    }, {});
  }

  _validateMutualExclusivity(result) {
    const propertiesPerExclusivityKey = this._allExclusivityKeys.reduce((acc, key) => {
      acc[key] = [];
      Object.keys(this.definitions.flags).forEach((flagName) => {
        const flagDefinition = this.definitions.flags[flagName];
        if (key === flagDefinition.exclusivityKey && result.flags[flagName]) {
          acc[key].push(flagName);
        }
      });

      Object.keys(this.definitions.named).forEach((namedArgName) => {
        const namedArgDefinition = this.definitions.named[namedArgName];
        if (key === namedArgDefinition.exclusivityKey && result.named[namedArgName]) {
          acc[key].push(namedArgName);
        }
      });

      return acc;
    }, {});

    objectValues(propertiesPerExclusivityKey).forEach((propertiesUsed) => {
      if (propertiesUsed.length > 1) {
        throw new Error('Expected only one of the following flags to be defined: ' + propertiesUsed.join(', '));
      }
    });
  }

  _parseNamedAndFlags(args, result) {
    let index = this.definitions.default.length;

    while (index < args.length) {
      if (typeof args[index] !== 'string') {
        break;
      }
      const argName = args[index].toLowerCase();
      if (!this.definitions.interchangeableOrderDefinitions[argName]) {
        break;
      }
      const definition = this.definitions.interchangeableOrderDefinitions[argName];
      if (!definition) {
        throw new Error('Unable to parse the parameter ' + args[index]);
      }

      if (definition.isNamed) {
        result.named[argName] = this._parseWithDefinition(args[index], this.definitions.named[argName], args[index + 1]);
        index += 2;
      } else if (definition.isFlag) {
        result.flags[argName] = true;
        index++;
      }
    }

    return index;
  }

  _parseMultiple(args, result, index) {
    if (!this.definitions.multiple) {
      return index;
    }
    const step = Object.keys(this.definitions.multiple).length;
    let currentPropertyIndex = 0;
    let currentObject = {};
    while (index < args.length) {
      const currentProperty = this.definitions.multiple[currentPropertyIndex];

      currentObject[currentProperty.name] = this._parseWithDefinition(currentProperty.name, currentProperty, args[index]);

      currentPropertyIndex = (currentPropertyIndex + 1) % step;

      if (currentPropertyIndex === 0) {
        result.multiple.push(currentObject);
        currentObject = {};
      }

      index++;
    }

    if (currentPropertyIndex !== 0 || result.multiple.length === 0) {
      throw new ReplyError('ERR wrong number of arguments for \'' + this.commandName + '\' command');
    }

    return index;
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
    args = flat(args);
    const result = {
      default: this._parseDefault(args),
      named: {},
      flags: this._getAllFlagsAsFalse(),
      multiple: []
    };

    let index = this._parseNamedAndFlags(args, result);
    index = this._parseMultiple(args, result, index);

    if (index !== args.length) {
      throw new ReplyError('ERR wrong number of arguments for \'' + this.commandName + '\' command');
    }

    this._validateAllRequiredArgsDefined(result);
    this._validateMutualExclusivity(result);

    return result;
  }

};
