// Back like in a native app (specification 9.5): it closes the top layer or goes to the previous screen, and
// on the home screen it closes the app.

import { test, expect } from './fixtures.js';
import { seedHome } from './app.js';

test.use({ locale: 'pl-PL' });

/** Opens the app in a fresh document after a page that is not the app, as if launched. */
async function launch(page) {
  await page.goto('about:blank');
  await page.goto(new URL('./#/', test.info().project.use.baseURL).href);
  await page.waitForSelector('body[data-ready]');
}

test.describe('Back', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'redmi', 'Once is enough.'));

  test('on the home screen Back leaves the app, also after screens that end on it', async ({ page }) => {
    await seedHome(page, { kinds: ['KITCHEN', 'BATHROOM'], ageDays: 5 });
    await launch(page);

    // Settings and a page inside them, back to home with Back.
    await page.getByRole('button', { name: 'Ustawienia' }).click();
    await page.getByRole('button', { name: /Pomieszczenia/ }).click();
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Ustawienia', level: 1 })).toBeVisible();
    await page.goBack();
    await expect(page.locator('.home-root[data-mode="idle"]')).toBeVisible();

    // A big clean started from its own screen ends on the home screen.
    await page.getByRole('button', { name: 'Porządki' }).click();
    await page.getByRole('button', { name: 'Zaczynamy' }).click();
    await expect(page.locator('.home-root')).toHaveAttribute('data-clean', 'true');
    await page.getByRole('button', { name: 'Zakończ' }).click();
    await expect(page.locator('.home-root[data-mode="idle"]')).toBeVisible();

    // A Sweep of one room, ended with X.
    await page.getByRole('button', { name: 'Obchód' }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Kuchnia/ }).click();
    await expect(page).toHaveURL(/#\/sweep\/area\/room:1$/);
    await page.getByRole('button', { name: 'Przerwij Obchód' }).click();
    await expect(page.locator('.home-root[data-mode="idle"]')).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL('about:blank');
  });

  test('Back closes a layer first, then goes to the previous screen', async ({ page }) => {
    await seedHome(page, { kinds: ['KITCHEN'] });
    await launch(page);
    await page.getByRole('button', { name: 'Ustawienia' }).click();
    await page.getByRole('button', { name: /Język/ }).click();
    await expect(page.getByRole('dialog', { name: 'Język' })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Ustawienia', level: 1 })).toBeVisible();
    await page.goBack();
    await expect(page.locator('.home-root[data-mode="idle"]')).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL('about:blank');
  });
});
