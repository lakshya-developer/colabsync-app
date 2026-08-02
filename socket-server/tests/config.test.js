const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

function loadConfig() {
  delete require.cache[require.resolve('../config')];
  process.env.NEXTAUTH_SECRET = '';
  process.env.MONGODB_URI = '';
  process.env.NODE_ENV = 'development';
  return require('../config');
}

test('uses development fallbacks when env vars are missing', () => {
  const config = loadConfig();

  assert.equal(config.jwt.secret, 'dev-secret-change-me');
  assert.equal(config.mongodb.uri, 'mongodb://127.0.0.1:27017/collabsync');
  assert.equal(config.nodeEnv, 'development');
});
