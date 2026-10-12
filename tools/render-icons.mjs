// Renders the app icon PNGs from the SVG sources with Playwright's Chromium.
//
//   node tools/render-icons.mjs
//
// Sources: assets/icons/app.svg (rounded square, "any") and
// assets/icons/app-maskable.svg (full bleed, content in the safe zone).
// Run it after changing either source and commit the PNGs.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ICONS = fileURLToPath(new URL('../assets/icons/', import.meta.url));

const OUTPUTS = [
  { source: 'app.svg', file: 'app-192.png', size: 192 },
  { source: 'app.svg', file: 'app-512.png', size: 512 },
  { source: 'app-maskable.svg', file: 'app-maskable-192.png', size: 192 },
  { source: 'app-maskable.svg', file: 'app-maskable-512.png', size: 512 },
  // iOS rounds the corners itself and shows the whole square, so the maskable
  // artwork is cropped closer to make the house a bit bigger.
  { source: 'app-maskable.svg', file: 'apple-touch-icon.png', size: 180, viewBox: '15 15 78 78' },
];

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const { source, file, size, viewBox } of OUTPUTS) {
    let svg = await readFile(ICONS + source, 'utf8');
    if (viewBox) svg = svg.replace(/viewBox="[^"]*"/, `viewBox="${viewBox}"`);
    svg = svg.replace('<svg ', `<svg width="${size}" height="${size}" `);
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg}`,
    );
    const png = await page.locator('svg').screenshot({ omitBackground: true });
    await writeFile(ICONS + file, png);
    console.log(`${file} (${size}×${size})`);
  }
} finally {
  await browser.close();
}
