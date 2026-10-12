// Shared Playwright fixtures and helpers.

import { test as base, expect } from '@playwright/test';

export { expect };

export const test = base.extend({
  // Text size like the browser or system setting (1.3 = 130%). The app sizes
  // everything in rem, so a larger root font size is the same thing.
  fontScale: [1, { option: true }],

  page: async ({ page, fontScale }, use) => {
    if (fontScale !== 1) {
      await page.addInitScript((scale) => {
        document.addEventListener('DOMContentLoaded', () => {
          document.documentElement.style.fontSize = `${scale * 100}%`;
        });
      }, fontScale);
    }
    await use(page);
  },
});

/** Waits until fonts and images are ready, so a screenshot shows the final look. */
export async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((image) => (image.complete ? null : image.decode().catch(() => null))),
    );
  });
}

/**
 * Saves a screenshot to screenshots/<project>/<name>.png for review.
 * Not a visual regression check: the files are only looked at.
 */
export async function shoot(page, name, options = {}) {
  await settle(page);
  const project = test.info().project.name;
  await page.screenshot({ path: `screenshots/${project}/${name}.png`, ...options });
}
