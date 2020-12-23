'use strict';

const getAllObjectMethods = (obj) => {
  const properties = new Set();
  let currentObj = obj;
  do {
    Object.getOwnPropertyNames(currentObj).forEach((item) => {
      if (item !== 'constructor') {
        properties.add(item);
      }
    });
  } while ((currentObj = Object.getPrototypeOf(currentObj)));
  return Array.from(properties)
  .filter((item) => typeof obj[item] === 'function')
  .sort((a, b) => {
    if (a < b) {
      return -1;
    }
    if (a > b) {
      return 1;
    }
    return 0;
  });
};



const getAllClassMethods = (type) => Object.keys(type.prototype)
    .filter((name) => name !== 'constructor' && typeof type.prototype[name] === 'function');

const getAllMethods = (objOrType) => typeof objOrType === 'object'
    ? getAllObjectMethods(objOrType)
    : getAllClassMethods(objOrType);

const extendMethodArray = (methodsArr) => {
  methodsArr.skip = (...skipArr) => extendMethodArray(methodsArr.filter((method) => !skipArr.includes(method)));
  methodsArr.add = (...addArr) => extendMethodArray(addArr.concat(methodsArr));
  return methodsArr;
};

module.exports = {
  getMethods(obj) {
    return {
      public() {
        return extendMethodArray(getAllMethods(obj)
          .filter((methodName) => !methodName.startsWith('_')));
      }
    };
  }
};
