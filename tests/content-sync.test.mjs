import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import { spawn } from 'node:child_process';

const projectRoot = new URL('../', import.meta.url);
const trackedFiles = [
  new URL('assets/js/local-content.js', projectRoot),
  new URL('index.html', projectRoot),
];

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

const before = await Promise.all(trackedFiles.map(async (file) => (
  hash(await fs.readFile(file))
)));
let contentRequestCount = 0;

const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  const action = url.searchParams.get('action');
  const language = url.searchParams.get('language');

  if (action === 'content') {
    contentRequestCount += 1;
  }

  const payload = action === 'news'
    ? {
        success: true,
        news: language === 'ru' ? '' : '<h2>News</h2><p>Test</p>',
      }
    : {
        success: true,
        description: '<h2>Description</h2><p>Test</p>',
        rules: '<h3>Rules</h3><p>Test</p>',
      };

  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(payload));
});

await new Promise((resolve) => {
  server.listen(0, '127.0.0.1', resolve);
});

const address = server.address();
const exitCode = await new Promise((resolve) => {
  const child = spawn(process.execPath, ['scripts/sync-content.mjs', '--news-only'], {
    cwd: new URL('.', projectRoot),
    env: {
      ...process.env,
      GAME_CONTENT_API_URL: `http://127.0.0.1:${address.port}`,
    },
    stdio: 'ignore',
  });

  child.on('exit', resolve);
});

server.close();

const after = await Promise.all(trackedFiles.map(async (file) => (
  hash(await fs.readFile(file))
)));

assert.notEqual(exitCode, 0);
assert.deepEqual(after, before);
assert.equal(contentRequestCount, 0);

console.log('News-only sync failure-preservation test passed.');
