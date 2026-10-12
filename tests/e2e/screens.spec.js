import { test, expect, shoot } from './fixtures.js';

for (const colorScheme of ['light', 'dark']) {
  test(`start screen, ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('./');
    await expect(page.getByRole('heading', { name: 'Cleaneh' })).toBeVisible();
    await shoot(page, `start-${colorScheme}`);
  });
}

test('the layout does not scroll sideways', async ({ page }) => {
  await page.goto('./');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test('Nunito is used for text', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => document.fonts.ready);
  const loaded = await page.evaluate(() => document.fonts.check('700 1rem Nunito'));
  expect(loaded).toBe(true);
});
