'use strict';

const fs = require('fs');
const path = require('path');
const types = require('../lib/utils/types');
const redis = require('redis');
const mock = require('../lib');

const getBadgeColor = (percentage) => {
  if (percentage >= 90) {
    return 'brightgreen';
  }
  if (percentage >= 60) {
    return 'yellow';
  }
  return 'red';
};

const replaceVersion = (coverage) => {
  const color = getBadgeColor(coverage.percentage);
  const readmeFilePath = path.join(__dirname, '..', 'README.md');
  const readme = fs.readFileSync(readmeFilePath).toString();
  const updatedReadme = readme.replace(
    /!\[mock-completeness].+\)/g,
    '![mock-completeness](https://img.shields.io/badge/Methods%20mocked-'
    + coverage.percentage
    + '%25%20('
    + coverage.mocked
    + '%2F'
    + coverage.real
    + ')-'
    + color
    + ')'
  );
  fs.writeFileSync(readmeFilePath, updatedReadme);
};

const getCoverage = () => {
  const coverage = (lib) => {
    const rootMethods = types.getMethods(lib).public();
    const clientMethods = types.getMethods(lib.createClient()).public();

    return rootMethods.length + clientMethods.length;
  };

  const real = coverage(redis);
  const mocked = coverage(mock);
  return { real, mocked, percentage: Math.round(mocked / (real / 100)) };
};

const coverage = getCoverage();
replaceVersion(coverage);

console.log('Successfully updated the README.md to specify the Mocked method coverage as ' + coverage.percentage + '%');
process.exit(0);
