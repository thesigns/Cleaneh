// The Sweep screen on the engine (specification 6, 4.5, 9.5).

import { test, expect, shoot } from './fixtures.js';
import { seedHome, stored } from './app.js';

test.use({ locale: 'pl-PL' });

const FLAT = { kinds: ['KITCHEN', 'BATHROOM'] };

const walkCard = (page) => page.locator('.card--front .move-card');
const question = (page) => page.locator('.card--front .question-card__text');
const next = (page) => page.getByRole('button', { name: 'Dalej' });

const screen = (page) => page.locator('.screen[data-step]');

/** Waits for a question card (not the walk card) to be shown. */
async function questionShown(page) {
  await expect(screen(page)).toHaveAttribute('data-moving', 'false');
  await question(page).waitFor();
}

/** "Next" on the walk card, then waits for the question. */
async function arrive(page) {
  await expect(screen(page)).toHaveAttribute('data-moving', 'true');
  await next(page).click();
  await questionShown(page);
}

/** Answers the current question with a button and waits until the answer is saved and the next card shown. */
async function answer(page, label) {
  await questionShown(page);
  const step = Number(await screen(page).getAttribute('data-step'));
  await page.getByRole('button', { name: label, exact: true }).click();
  await expect(async () => {
    if (await page.locator('.summary').count()) return;
    expect(Number(await screen(page).getAttribute('data-step'))).toBe(step + 1);
  }).toPass();
}

/** Goes through the whole Sweep: Next on walk cards, `label` on questions. Returns how many questions came. */
async function answerAll(page, label = 'TAK') {
  let questions = 0;
  while (!(await page.locator('.summary').count())) {
    if ((await screen(page).getAttribute('data-moving')) === 'true') {
      await arrive(page);
    } else {
      await answer(page, label);
      questions++;
    }
  }
  return questions;
}

test.describe('first Sweep', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'redmi', 'Once is enough.'));

  test('a walk card before each room, the questions, then the summary and the first task', async ({ page }) => {
    await seedHome(page, FLAT, '/sweep/first');
    await expect(walkCard(page)).toContainText('Kuchnia');
    await expect(page.locator('.card--front .pill')).toContainText(/\d+ pyta/);
    await arrive(page);
    await expect(page.locator('.card--front .card-chips')).toContainText('Kuchnia');
    await expect(page.locator('.topbar__sub')).toHaveText(/^Kuchnia · 1\/\d+$/);

    const total = (await stored(page)).sweep.keys.length;
    // Answer NO once, so there is something to start with.
    await answer(page, 'NIE');
    const questions = 1 + (await answerAll(page, 'TAK'));
    expect(questions).toBe(total);

    await expect(page.getByRole('heading', { name: 'Obchód zaliczony!' })).toBeVisible();
    await expect(page.locator('.spot')).toHaveCount(1);
    await page.getByRole('button', { name: 'Zacznij od pierwszego' }).click();
    await expect(page).toHaveURL(/#\/$/);
    const after = await stored(page);
    expect(after.sweep).toBeNull();
    expect(after.activity.kind).toBe('timing');
    expect(after.history.sweeps).toEqual([expect.objectContaining({ scope: 'first', completed: true, answered: total })]);
  });

  test('undo brings the card back, without the walk card again', async ({ page }) => {
    await seedHome(page, FLAT, '/sweep/first');
    await arrive(page);
    const first = await question(page).textContent();
    await answer(page, 'TAK');
    await page.getByRole('button', { name: 'Cofnij' }).click();
    await expect(question(page)).toHaveText(first);
    await expect(walkCard(page)).toHaveCount(0);
    expect((await stored(page)).sweep.steps).toHaveLength(0);
    await expect(page.getByRole('button', { name: 'Cofnij' })).toBeDisabled();
  });

  test('Back pauses the first Sweep; it continues where it stopped, with the walk card again', async ({ page }) => {
    await seedHome(page, FLAT, '/sweep/first');
    await arrive(page);
    await answer(page, 'TAK');
    await answer(page, 'NIE MAM');
    const third = await question(page).textContent();
    await page.goBack();
    await expect(page.getByRole('button', { name: 'Dokończ pierwszy Obchód' })).toBeVisible();
    expect((await stored(page)).sweep.steps).toHaveLength(2);

    await page.getByRole('button', { name: 'Dokończ pierwszy Obchód' }).click();
    // Back in the same room, but after reopening its walk card shows again (4.5).
    await expect(walkCard(page)).toHaveCount(0);
    await expect(question(page)).toHaveText(third);
  });

  test('a swipe answers like the button', async ({ page }) => {
    await seedHome(page, FLAT, '/sweep/first');
    await arrive(page);
    const card = page.locator('.card--front');
    const box = await card.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + box.width / 2 - 24 * i, box.y + box.height / 2);
    await page.mouse.up();
    await expect.poll(async () => (await stored(page)).sweep.steps.map((s) => s.answer)).toEqual(['NO']);
  });
});

test.describe('on-demand Sweep', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'redmi', 'Once is enough.'));

  test('the scope sheet offers the home and the rooms with something due; X after an answer shows the summary', async ({ page }) => {
    await seedHome(page, { kinds: ['KITCHEN', 'BATHROOM', 'ROOM'], ageDays: 5 });
    await page.getByRole('button', { name: 'Obchód' }).click();
    const sheet = page.getByRole('dialog', { name: 'Co obchodzimy?' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('button', { name: /Całe mieszkanie/ })).toContainText(/\d+ do sprawdzenia/);
    await shoot(page, 'sweep-scope');
    await sheet.getByRole('button', { name: /Całe mieszkanie/ }).click();
    await expect(page).toHaveURL(/#\/sweep$/);
    await arrive(page);
    await answer(page, 'TAK');
    await page.getByRole('button', { name: 'Przerwij Obchód' }).click();
    await expect(page.getByRole('heading', { name: 'Obchód zaliczony!' })).toBeVisible();
    await page.getByRole('button', { name: /Gotowe|Później/ }).click();
    await expect(page.getByRole('button', { name: 'Obchód', exact: true })).toBeVisible();
    expect((await stored(page)).history.sweeps).toEqual([expect.objectContaining({ scope: 'home', completed: false, answered: 1 })]);
  });

  test('Back closes the scope sheet', async ({ page }) => {
    await seedHome(page, { kinds: ['KITCHEN'] });
    await page.getByRole('button', { name: 'Obchód' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Obchód' })).toBeVisible();
  });

  test('X before any answer just ends the Sweep', async ({ page }) => {
    await seedHome(page, { kinds: ['KITCHEN', 'BATHROOM'], ageDays: 5 }, '/sweep');
    await page.getByRole('button', { name: 'Przerwij Obchód' }).click();
    await expect(page.getByRole('button', { name: 'Obchód', exact: true })).toBeVisible();
    const after = await stored(page);
    expect(after.sweep).toBeNull();
  });

  test('with nothing due the summary says so', async ({ page }) => {
    await seedHome(page, { kinds: ['KITCHEN'] }, '/sweep');
    await expect(page.getByText('Teraz nic nie czeka. Pięknie!')).toBeVisible();
  });
});

test.describe('screenshots', () => {
  for (const [name, theme] of [['light', 'light'], ['dark', 'dark']]) {
    test(`Sweep, ${name}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await seedHome(page, { kinds: ['ENTRYWAY', 'KITCHEN', 'BEDROOM'] }, '/sweep/first');
      await walkCard(page).waitFor();
      await page.waitForTimeout(500);
      await shoot(page, `sweep-walk-${name}`);
      await arrive(page);
      await page.waitForTimeout(500);
      await shoot(page, `sweep-question-${name}`);
      await answer(page, 'NIE');
      await answer(page, 'NIE');
      await answerAll(page, 'TAK');
      await page.waitForTimeout(900);
      await shoot(page, `sweep-summary-${name}`);
    });
  }
});
