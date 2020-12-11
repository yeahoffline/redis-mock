'use strict';

module.exports = {
  arrayEqualInAnyOrder(arr1, arr2) {
    if (arr1.length !== arr2.length) {
      return false;
    }
    return arr1.every((val1) => arr2.find((val2) => val1 === val2));
  }
};
