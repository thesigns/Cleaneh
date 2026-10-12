import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ROOT, appFiles, stampedServiceWorker } from '../../tools/stamp-sw.mjs';

test('sw.js lists the current app files and their hash (run `npm run stamp`)', async () => {
  const current = await readFile(ROOT + 'sw.js', 'utf8');
  assert.equal(current, await stampedServiceWorker());
});

test('every file referenced by index.html and the manifest is an app file', async () => {
  const files = new Set(await appFiles());
  const html = await readFile(ROOT + 'index.html', 'utf8');
  const manifest = JSON.parse(await readFile(ROOT + 'manifest.webmanifest', 'utf8'));
  const referenced = [
    ...[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]),
    ...manifest.icons.map((icon) => icon.src),
  ];
  assert.ok(referenced.length > 0);
  for (const path of referenced) {
    assert.ok(files.has(path), `${path} is not an app file`);
  }
});

test('app paths are relative, so the app works under a subpath', async () => {
  const html = await readFile(ROOT + 'index.html', 'utf8');
  const manifest = JSON.parse(await readFile(ROOT + 'manifest.webmanifest', 'utf8'));
  for (const [, path] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    assert.ok(!path.startsWith('/'), `${path} in index.html is absolute`);
  }
  for (const key of ['id', 'start_url', 'scope']) {
    assert.ok(!manifest[key].startsWith('/'), `manifest ${key} is absolute`);
  }
});
