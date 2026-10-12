import { test, expect, settle } from './fixtures.js';

// Runs only in the redmi project (playwright.config.js).

/** Waits until the service worker is installed and controls the page. */
async function waitForServiceWorker(page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;
    await new Promise((resolve) =>
      navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }),
    );
  });
}

test('after the first load the app opens without network', async ({ page, context }) => {
  await page.goto('./');
  await waitForServiceWorker(page);

  await context.setOffline(true);
  await page.reload();

  await expect(page.locator('.home__name')).toHaveText('Cleaneh');
  await settle(page);
  const offline = await page.evaluate(() => ({
    font: document.fonts.check('700 1rem Nunito'),
    icon: document.querySelector('.home__logo').naturalWidth > 0,
    styled: getComputedStyle(document.body).backgroundColor,
  }));
  expect(offline.font).toBe(true);
  expect(offline.icon).toBe(true);
  expect(offline.styled).toBe('rgb(251, 248, 243)');
});

test('a link with a query string opens the cached app offline', async ({ page, context }) => {
  await page.goto('./');
  await waitForServiceWorker(page);

  await context.setOffline(true);
  await page.goto('./?source=homescreen');

  await expect(page.locator('.home__name')).toHaveText('Cleaneh');
});

test('the service worker caches every app file under the current version', async ({ page }) => {
  await page.goto('./');
  await waitForServiceWorker(page);
  const cached = await page.evaluate(async () => {
    const names = await caches.keys();
    const cache = await caches.open(names.find((name) => name.startsWith('cleaneh-')));
    return { names, count: (await cache.keys()).length };
  });
  expect(cached.names).toHaveLength(1);
  expect(cached.count).toBeGreaterThan(10);
});
