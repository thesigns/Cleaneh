import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ROOT } from '../../tools/stamp-sw.mjs';

const manifest = JSON.parse(await readFile(ROOT + 'manifest.webmanifest', 'utf8'));

/** Width and height from a PNG header. */
async function pngSize(path) {
  const data = await readFile(ROOT + path);
  assert.equal(data.toString('latin1', 1, 4), 'PNG', `${path} is not a PNG`);
  return `${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`;
}

test('manifest makes the app installable as a standalone portrait app', () => {
  assert.equal(manifest.name, 'Cleaneh');
  assert.equal(manifest.short_name, 'Cleaneh');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.orientation, 'portrait');
  assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/);
  assert.match(manifest.background_color, /^#[0-9a-f]{6}$/);
});

test('manifest has regular and maskable icons in 192 and 512', () => {
  for (const purpose of ['any', 'maskable']) {
    const sizes = manifest.icons.filter((icon) => icon.purpose === purpose).map((icon) => icon.sizes);
    assert.deepEqual(sizes.sort(), ['192x192', '512x512'], purpose);
  }
});

test('icon files have the sizes the manifest declares', async () => {
  for (const icon of manifest.icons) {
    assert.equal(await pngSize(icon.src), icon.sizes, icon.src);
  }
  assert.equal(await pngSize('assets/icons/apple-touch-icon.png'), '180x180');
});
