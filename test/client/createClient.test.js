'use strict';

const { createClient } = require('../../');

// this is just a unit test. No need to run this against the real redis
if (process.env.VALID_TESTS) {
  return;
}

require('should');

describe('Given the createClient, When invoking the function', () => {

  it('with url as a parameter, url in options, host + port parameter and host + port in options ' +
    'then they all return different clients, but the same underlying instance of RedisMock', () => {
    const urlParam = createClient('redis://lol:1234');
    const optionsUrl = createClient({ url: 'redis://lol:1234'});
    const hostPortParam = createClient(1234, 'lol');
    const hostPortOptions = createClient({host: 'lol', port: 1234});
    const allClients = [urlParam, optionsUrl, hostPortOptions, hostPortParam];

    for (let i = 0; i < allClients.length; i++) {
      for (let j = i + 1; j < allClients.length; j++) {
        allClients[i].should.not.equal(allClients[j]);
        allClients[i]._redisMock.should.equal(allClients[j]._redisMock);
      }
    }
  });

  it('with url as a parameter, url in options, host + port + path parameter and host + port + path in options ' +
    'then they all return different clients, but the same underlying instance of RedisMock', () => {
    const urlParam = createClient('redis://lol:1234/abc');
    const optionsUrl = createClient({ url: 'redis://lol:1234/abc'});
    const hostPortParam = createClient(1234, 'lol', { path: '/abc' });
    const hostPortOptions = createClient({host: 'lol', port: 1234, path: '/abc'});
    const allClients = [urlParam, optionsUrl, hostPortOptions, hostPortParam];

    for (let i = 0; i < allClients.length; i++) {
      for (let j = i + 1; j < allClients.length; j++) {
        allClients[i].should.not.equal(allClients[j]);
        allClients[i]._redisMock.should.equal(allClients[j]._redisMock);
      }
    }
  });

  it('with 2 different URLs, Then the underlying redis is also different', () => {
    const client1 = createClient('redis://lol:1234/a');
    const client2 = createClient('redis://lol:1234/b');

    client1._redisMock.should.not.equal(client2);
  });

  it('with the url param, Then the remaining options parameters are successfully parsed', () => {
    const client = createClient('redis://lol:1234/a');

    client.options.host.should.equal('lol');
    client.options.port.should.equal(1234);
    client.options.path.should.equal('/a');
  });

  it('with the URL param that does not specify the port, Then the default port is populated', () => {
    const client = createClient('redis://lol/a');

    client.options.port.should.equal(6379);
  });

  it('With the host, but without the port, Then the default port is populated', () => {
    const client = createClient({ host: 'localhost' });

    client.options.port.should.equal(6379);
  });
});
