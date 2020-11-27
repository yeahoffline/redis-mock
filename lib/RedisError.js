module.exports = class extends Error {

  constructor(code, message) {
    super(message);
    this.code = code;
  }

};
