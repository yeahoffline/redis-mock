'use strict';

const normalizeUrl = (url) => {
  if (url.startsWith('redis://')) {
    url = url.replace('redis://', '');
  } else if (url.startsWith('rediss://')) {
    url = url.replace('rediss://', '');
  }
  if (url.includes('@')) {
    url = url.split('@')[1];
  }
  return url;
};

const extractHost = (url) => {
  const matchedHost = url.match(/^(\w+)/);
  if (!matchedHost) {
    throw new Error('The URL "' + url + '" is not vlaid');
  }
  return matchedHost[1];
};

const extractPort = (url) => {
  const matchedPort = url.match(/^\w+:(\d+)/);
  if (!matchedPort) {
    return undefined;
  }
  if (isNaN(matchedPort[1])) {
    throw new Error('The port "' + matchedPort[1] + '" is not valid');
  }
  return parseInt(matchedPort[1], 10);
};

const extractPath = (url) => {
  const matchedPath = url.match(/[^/]+(\/[^?]+)/) || [];
  return matchedPath[1];
};

const extractQueryParams = (url) => {
  const queryParams = url.match(/\?(.+)$/);
  if (!queryParams) {
    return;
  }
  return queryParams[1].split('&')
    .map((param) => {
      const qp = param.split('=');
      const result = {};
      result[qp[0]] = decodeURIComponent(qp[1]);
      return result;
    })
.reduce((acc, v) => Object.assign(acc, v), {});
};

const parseNormalized = (url) => Object.assign(({
  host: extractHost(url),
  port: extractPort(url),
  path: extractPath(url),
}), extractQueryParams(url));

module.exports = (url) => {
  const result = parseNormalized(normalizeUrl(url));

  Object.keys(result).forEach((key) => {
    if (typeof result[key] === 'undefined') {
      delete result[key];
    }
  });

  return result;
};
