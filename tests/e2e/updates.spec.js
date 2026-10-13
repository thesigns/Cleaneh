// New versions of the app (specification 9.2): they go in only when the app is opened, never in the middle
// of something. Runs only in the redmi project (playwright.config.js), on a server of its own that can
// publish a new version: the same files, sw.js with another version name. (Playwright cannot change the
// service worker script on the way.)

import { test as base, expect } from './fixtures.js';
import { seedHome, stored } from './app.js';
import { createFileServer } from '../../tools/serve.mjs';

/** Each worker has its own server; `publish(version)` puts a new version on it. */
const test = base.extend({
  server: [
    // Playwright needs the destructuring, even when empty.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      let published = null;
      const server = createFileServer({
        base: 'Cleaneh',
        transform: (path, text) => (path === 'sw.js' && published ? text.replace(/const VERSION = '\w+'/, `const VERSION = '${published}'`) : null),
      });
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      await use({ url: `http://127.0.0.1:${server.address().port}/Cleaneh/`, publish: (version) => (published = version) });
      await new Promise((resolve) => server.close(resolve));
    },
    { scope: 'worker' },
  ],
  baseURL: async ({ server }, use) => {
    server.publish(null);
    await use(server.url);
  },
});

test.use({ locale: 'pl-PL' });

/** Waits until the service worker is installed and controls the page. */
async function waitForServiceWorker(page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;
    await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
  });
}


/** Has the browser fetch the new version now; resolves once it waits. */
async function downloadNewVersion(page) {
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration.update();
    const worker = registration.installing ?? registration.waiting;
    if (worker && worker.state !== 'installed') await new Promise((resolve) => worker.addEventListener('statechange', () => worker.state === 'installed' && resolve()));
  });
}

// The page may be reloading into the new version meanwhile.
const cacheNames = (page) => page.evaluate(() => caches.keys()).catch(() => []);

test('a new version waits while a series is going on and goes in at the next opening', async ({ page, server }) => {
  await seedHome(page, { kinds: ['KITCHEN'], ageDays: 5 });
  await waitForServiceWorker(page);
  const [current] = await cacheNames(page);

  await page.getByRole('button', { name: 'Daj mi zadanie' }).click();
  await expect(page.locator('.home-root')).toHaveAttribute('data-mode', 'asking');
  server.publish('next00000000');
  await downloadNewVersion(page);

  // Opening the app in the middle of a series: the series stays, the new version waits.
  await page.reload();
  await page.waitForSelector('body[data-ready]');
  await expect(page.locator('.home-root')).toHaveAttribute('data-mode', 'asking');
  expect(await cacheNames(page)).toContain(current);
  expect(await page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting))).toBe(true);

  await page.getByRole('button', { name: 'Zakończ' }).click();
  await expect(page.locator('.home-root')).toHaveAttribute('data-mode', 'idle');
  expect((await stored(page)).activity.kind).toBe('idle');

  // The next opening: the page reloads into the new version before showing anything.
  await page.reload();
  await expect.poll(() => cacheNames(page), { timeout: 10_000 }).toEqual(['cleaneh-next00000000']);
  await page.waitForSelector('body[data-ready]');
  await expect(page.locator('.home-root')).toHaveAttribute('data-mode', 'idle');
});
