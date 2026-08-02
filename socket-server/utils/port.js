const net = require('node:net');

async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, '127.0.0.1');
  });
}

async function findAvailablePort(startPort, tries = 10) {
  let candidate = startPort;

  for (let index = 0; index < tries; index += 1) {
    if (await isPortAvailable(candidate)) {
      return candidate;
    }
    candidate += 1;
  }

  throw new Error(`Unable to find an available port after ${tries} attempts`);
}

module.exports = { isPortAvailable, findAvailablePort };
