import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'game-page-content-images-'));
const testProject = path.join(temporaryRoot, 'project');
const tinyPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
let includeImage = true;

await fs.mkdir(path.join(testProject, 'scripts'), { recursive: true });
await fs.mkdir(path.join(testProject, 'assets', 'js'), { recursive: true });
await fs.mkdir(path.join(testProject, 'Pics', 'Icons'), { recursive: true });
await fs.mkdir(path.join(testProject, 'Pics', 'Map'), { recursive: true });

for (const relativePath of [
  'scripts/sync-content.mjs',
  'assets/js/config.js',
  'assets/js/local-content.js',
  'assets/js/local-registrations.js',
  'index.html',
]) {
  const target = path.join(testProject, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(path.join(projectRoot, relativePath), target);
}

await fs.writeFile(path.join(testProject, 'Pics', 'Icons', 'manual-icon.txt'), 'keep');
await fs.writeFile(path.join(testProject, 'Pics', 'Map', 'manual-map.txt'), 'keep');

const registrationColumns = [
  'Player Number',
  'Permanent Registration Number',
  'First Name',
  'Callsign',
  'Side',
  'Payment Status',
].map((key) => ({ key, label: key }));

const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  const action = url.searchParams.get('action');
  const image = includeImage
    ? `<img src="data:image/png;base64,${tinyPng}" alt="Test image">`
    : '';
  let payload;

  if (action === 'content') {
    payload = {
      success: true,
      description: `<h2>Description</h2><p>Before ${image} after</p>`,
      rules: '<h3>Rules</h3><p>Rule text</p>',
    };
  } else if (action === 'news') {
    payload = {
      success: true,
      news: '<h2>News</h2><p>News text</p>',
    };
  } else {
    payload = {
      success: true,
      columns: registrationColumns,
      rows: [],
    };
  }

  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(payload));
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const apiUrl = `http://127.0.0.1:${address.port}`;

async function runSync() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/sync-content.mjs'], {
      cwd: testProject,
      env: {
        ...process.env,
        GAME_CONTENT_API_URL: apiUrl,
      },
    });
    let output = '';

    child.stdout.on('data', (chunk) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(output));
      }
    });
  });
}

await runSync();
const syncedDirectory = path.join(testProject, 'Pics', 'Synced');
const firstImages = await fs.readdir(syncedDirectory);
assert.equal(firstImages.length, 1);
assert.match(firstImages[0], /^[a-f0-9]{64}\.png$/);

const localContentPath = path.join(testProject, 'assets', 'js', 'local-content.js');
const firstContent = await fs.readFile(localContentPath, 'utf8');
assert.match(firstContent, /Pics\/Synced\/[a-f0-9]{64}\.png/);
assert.doesNotMatch(firstContent, /data:image\//);
const firstHash = crypto.createHash('sha256').update(firstContent).digest('hex');

const noChangeOutput = await runSync();
const secondContent = await fs.readFile(localContentPath, 'utf8');
const secondHash = crypto.createHash('sha256').update(secondContent).digest('hex');
assert.equal(secondHash, firstHash);
assert.match(noChangeOutput, /no files were changed/i);

includeImage = false;
await runSync();
assert.deepEqual(await fs.readdir(syncedDirectory), []);
assert.equal(await fs.readFile(path.join(testProject, 'Pics', 'Icons', 'manual-icon.txt'), 'utf8'), 'keep');
assert.equal(await fs.readFile(path.join(testProject, 'Pics', 'Map', 'manual-map.txt'), 'utf8'), 'keep');

server.close();
await fs.rm(temporaryRoot, { recursive: true, force: true });

console.log('Google Docs image localization tests passed.');
