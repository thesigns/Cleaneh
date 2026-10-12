// The development gallery: screenshots of the building blocks, and the card deck's gestures (specification 6.1, 9.5).

import { test, expect, shoot } from './fixtures.js';

const open = async (page, query = '') => {
  await page.goto(`dev/gallery.html${query}`);
  await page.waitForSelector('body[data-ready]');
};

for (const [name, query] of [
  ['series', '?view=series&lang=pl'],
  ['series-en', '?view=series&lang=en'],
  ['sweep', '?view=sweep&lang=pl'],
  ['move', '?view=move&lang=pl'],
  ['series-dark', '?view=series&lang=pl&theme=dark'],
  ['move-dark', '?view=move&lang=pl&theme=dark'],
]) {
  test(`gallery: ${name}`, async ({ page }) => {
    await open(page, query);
    await page.waitForTimeout(500); // the card's rise
    await shoot(page, `gallery-${name}`);
  });
}

test('gallery: overview', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'redmi', 'Once is enough.');
  await open(page, '?lang=pl');
  await shoot(page, 'gallery-overview', { fullPage: true });
});

/** Drags the front card by (dx, dy) with a pointer, in steps. */
async function drag(page, dx, dy, { release = true } = {}) {
  const card = page.locator('.card--front');
  const box = await card.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(x + (dx * i) / 10, y + (dy * i) / 10);
  if (release) await page.mouse.up();
}

test.describe('card deck', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'redmi', 'Once is enough.'));

  test('dragging shows the answer stamp and grows its button; a short drag springs back', async ({ page }) => {
    await open(page, '?view=sweep&lang=pl');
    await page.getByRole('button', { name: 'Dalej' }).click();
    await page.locator('.question-card').waitFor();
    await page.waitForTimeout(500);
    const first = await page.locator('.question-card__text').textContent();
    await drag(page, 60, 0, { release: false });
    expect(Number(await page.locator('.stamp--right').evaluate((el) => el.style.opacity))).toBeGreaterThan(0.3);
    expect(Number(await page.locator('[data-answer="YES"]').evaluate((el) => el.style.getPropertyValue('--emphasis')))).toBeGreaterThan(0.3);
    await shoot(page, 'gallery-dragging');
    await page.mouse.up();
    await page.waitForTimeout(600);
    expect(await page.locator('.question-card__text').textContent()).toBe(first);
    expect(await page.locator('.card--front').evaluate((el) => el.style.transform)).toContain('translate(0px, 0px)');
  });

  test('a long drag answers and the next card comes', async ({ page }) => {
    await open(page, '?view=sweep&lang=pl');
    await page.locator('.move-card').waitFor();
    await drag(page, 0, -300); // the walk card goes in any direction
    await page.locator('.question-card').waitFor();
    const first = await page.locator('.question-card__text').textContent();
    await drag(page, -220, 10);
    await expect(page.locator('.question-card__text')).not.toHaveText(first);
  });

  test('the buttons answer like the gestures, and undo brings the card back', async ({ page }) => {
    await open(page, '?view=sweep&lang=pl');
    await page.getByRole('button', { name: 'Dalej' }).click();
    await page.locator('.question-card').waitFor();
    const first = await page.locator('.question-card__text').textContent();
    await page.locator('[data-answer="YES"]').click();
    await expect(page.locator('.question-card__text')).not.toHaveText(first);
    await page.getByRole('button', { name: 'Cofnij' }).click();
    await expect(page.locator('.question-card__text')).toHaveText(first);
  });

  test('dragging the card does not scroll the page', async ({ page }) => {
    await open(page, '?view=series&lang=pl');
    expect(await page.locator('.card--front').evaluate((el) => getComputedStyle(el).touchAction)).toBe('none');
    expect(await page.evaluate(() => getComputedStyle(document.body).overscrollBehaviorY)).toBe('none');
  });
});
