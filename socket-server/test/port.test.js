const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { findAvailablePort } = require('../utils/port');

test('findAvailablePort skips an occupied port', async () => {
  const server = http.createServer();

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  const occupiedPort = server.address().port;
  const nextPort = await findAvailablePort(occupiedPort, 3);

  assert.notStrictEqual(nextPort, occupiedPort);

  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});
