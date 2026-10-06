import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import { spawn } from 'node:child_process';

const projectRoot = new URL('../', import.meta.url);
const target = new URL('assets/js/local-registrations.js', projectRoot);
let nonRegistrationRequests = 0;

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

const before = hash(await fs.readFile(target));
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  const action = url.searchParams.get('action');
  const language = url.searchParams.get('language');

  if (action !== 'registrations') {
    nonRegistrationRequests += 1;
  }

  const approvedColumns = [
    { key: 'Player Number', label: 'Player Number' },
    { key: 'Permanent Registration Number', label: 'Permanent number' },
    { key: 'First Name', label: 'First name' },
    { key: 'Callsign', label: 'Callsign' },
    { key: 'Side', label: 'Side' },
    { key: 'Payment Status', label: 'Payment' },
  ];
  const columns = language === 'ru'
    ? [...approvedColumns, { key: 'Email', label: 'Email' }]
    : approvedColumns;
  const payload = {
    success: true,
    columns,
    rows: [columns.map((column) => (
      column.key === 'Email' ? 'private@example.com' : column.key
    ))],
  };

  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(payload));
});

await new Promise((resolve) => {
  server.listen(0, '127.0.0.1', resolve);
});

const address = server.address();
const exitCode = await new Promise((resolve) => {
  const child = spawn(process.execPath, [
    'scripts/sync-content.mjs',
    '--registrations-only',
  ], {
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

const after = hash(await fs.readFile(target));

assert.notEqual(exitCode, 0);
assert.equal(after, before);
assert.equal(nonRegistrationRequests, 0);

console.log('Registration-only sync failure-preservation test passed.');
