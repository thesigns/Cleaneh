// The home screen and the main loop (specification 5, 4): give me a task, a series, the offer, the stopwatch,
// the reward, today's result and the last cleaning.

import { test, expect, shoot } from './fixtures.js';
import { editStored, openApp, resetStored, seedHome, stored } from './app.js';

test.use({ locale: 'pl-PL' });

const root = (page) => page.locator('.home-root');
const mode = (page, kind) => expect(root(page)).toHaveAttribute('data-mode', kind);
const settled = (page) => expect(root(page)).not.toHaveAttribute('data-busy', 'true');

/** Passes the walk card when the series moved to another room, and waits for the question. */
async function toQuestion(page) {
  await settled(page);
  await mode(page, 'asking');
  if ((await page.locator('.screen[data-moving]').getAttribute('data-moving')) === 'true') {
    await page.getByRole('button', { name: 'Dalej' }).click();
  }
  await expect(page.locator('.screen[data-moving="false"]')).toBeVisible();
}

/** Answers the series question with a button and waits for the next screen. */
async function answer(page, label) {
  await toQuestion(page);
  const before = await page.locator('.topbar h1').textContent();
  await page.getByRole('button', { name: label, exact: true }).click();
  await settled(page);
  await expect(async () => {
    const kind = await root(page).getAttribute('data-mode');
    if (kind === 'asking') expect(await page.locator('.topbar h1').textContent()).not.toBe(before);
  }).toPass();
}

const DAY = 86_400_000;
const HOUR = 3_600_000;
const doneEntry = (ago, minutes = 4) => ({ key: 'kitchen_counter_clean@room#1', kind: 'DONE', at: Date.now() - ago, taskTimeMs: minutes * 60_000 });

test.describe('home', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'redmi', 'Once is enough.'));

  test('a calm home before the first task, without a last-cleaning line', async ({ page }) => {
    await openApp(page);
    await mode(page, 'idle');
    await expect(page.getByRole('heading', { name: 'Na razie spokój' })).toBeVisible();
    await expect(page.locator('.home__hero .pill, .home__past')).toHaveCount(0);
  });

  test('nothing due: says so and suggests a Sweep', async ({ page }) => {
    await seedHome(page, { kinds: ['KITCHEN'] });
    await page.getByRole('button', { name: 'Daj mi zadanie' }).click();
    await expect(page.getByRole('heading', { name: 'Wszystko ogarnięte' })).toBeVisible();
    await expect(page.getByText('Teraz nic nie czeka. Może szybki Obchód?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Obchód', exact: true })).toHaveClass(/button--filled/);
  });

  // Hours are checked in the unit tests: a task 5 hours ago is usually today's, and today's result wins (5.1).
  test('the last cleaning: days and hours, full days, a warm sentence after a week', async ({ page }) => {
    await openApp(page);
    for (const [ago, text] of [
      [DAY + 2 * HOUR + 60_000, 'Ostatnie sprzątanie: 1 dzień i 2 godziny temu'],
      [3 * DAY + 60_000, 'Ostatnie sprzątanie: 3 dni temu'],
      [9 * DAY, 'Miło znowu widzieć. Zacznijmy od czegoś małego.'],
    ]) {
      await resetStored(page);
      await editStored(page, (state, entry) => ({ log: [entry] }), doneEntry(ago));
      await page.reload();
      await expect(page.getByText(text)).toBeVisible();
    }
  });

  test("today's result replaces the last cleaning once a task is done today", async ({ page }) => {
    await openApp(page);
    await editStored(page, (state, entries) => ({ log: entries }), [doneEntry(60_000, 4), doneEntry(120_000, 9.5)]);
    await page.reload();
    await expect(page.getByText('Dziś: 2 zadania · 14 min')).toBeVisible();
  });
});

test.describe('a series', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'redmi', 'Once is enough.'));

  test('question, NO, the offer, the stopwatch, DONE with its reward, the next question, X', async ({ page }) => {
    await seedHome(page, { kinds: ['KITCHEN', 'BATHROOM'], ageDays: 5 });
    await page.getByRole('button', { name: 'Daj mi zadanie' }).click();
    await mode(page, 'asking');
    await expect(page.locator('.topbar h1')).toHaveText('Pytanie 1');
    await expect(page.locator('.move-card')).toHaveCount(0); // no walk card before the first question
    await answer(page, 'TAK');
    await expect(page.locator('.topbar h1')).toHaveText('Pytanie 2');

    await toQuestion(page);
    await page.getByRole('button', { name: 'NIE', exact: true }).click();
    await mode(page, 'offering');
    await expect(page.getByText('Zrobić to teraz?')).toBeVisible();
    await page.getByRole('button', { name: 'Start' }).click();
    await mode(page, 'timing');
    await expect(page.locator('.stopwatch__clock')).toHaveText(/^0:0\d$/);
    await page.waitForTimeout(1200);
    await expect(page.locator('.stopwatch__clock')).not.toHaveText('0:00');

    await page.getByRole('button', { name: 'ZROBIONE' }).click();
    const reward = page.locator('.reward');
    await expect(reward).toBeVisible();
    await expect(reward.locator('.reward__title')).toHaveText(/Zrobione!|Brawo!|Pięknie!|Czyściutko!|Super robota!|Ekstra!|Tak trzymać!/);
    await expect(reward).toContainText('Dziś: 1 zadanie · 1 min');
    // The next question (or its walk card) already waits under the reward.
    await reward.getByRole('button', { name: 'Dalej' }).click();
    await expect(reward).toHaveCount(0);
    await mode(page, 'asking');
    await expect(page.locator('.topbar h1')).toHaveText('Pytanie 3');

    await page.getByRole('button', { name: 'Zakończ' }).click();
    await mode(page, 'idle');
    await expect(page.getByRole('heading', { name: 'Dobra robota!' })).toBeVisible();
    await expect(page.getByText('Dziś: 1 zadanie · 1 min')).toBeVisible();
    const { history } = await stored(page);
    expect(history.answers.map((a) => a.kind)).toEqual(['YES', 'NO', 'START', 'DONE', 'STOP']);
    expect(history.series).toHaveLength(1);
  });

  test('"Enough for now" on the reward ends the series', async ({ page }) => {
    await seedHome(page, { kinds: ['KITCHEN'], ageDays: 5 });
    await page.getByRole('button', { name: 'Daj mi zadanie' }).click();
    await page.getByRole('button', { name: 'NIE', exact: true }).click();
    await page.getByRole('button', { name: 'Start' }).click();
    await page.getByRole('button', { name: 'ZROBIONE' }).click();
    await page.getByRole('button', { name: 'Na razie wystarczy' }).click();
    await mode(page, 'idle');
    expect((await stored(page)).activity.kind).toBe('idle');
  });

  test('"Odpuszczam" ends the series without penalty', async ({ page }) => {
    await seedHome(page, { kinds: ['KITCHEN'], ageDays: 5 });
    await page.getByRole('button', { name: 'Daj mi zadanie' }).click();
    await page.getByRole('button', { name: 'NIE', exact: true }).click();
    await page.getByRole('button', { name: 'Start' }).click();
    await page.getByRole('button', { name: 'Odpuszczam' }).click();
    await mode(page, 'idle');
    const { history } = await stored(page);
    expect(history.answers.map((a) => a.kind)).toEqual(['NO', 'START', 'GIVE_UP']);
  });

  test('N/A asks first: "Zostaw" brings the card back, "Wyłącz" turns it off', async ({ page }) => {
    await seedHome(page, { kinds: ['KITCHEN'], ageDays: 5 });
    await page.getByRole('button', { name: 'Daj mi zadanie' }).click();
    const question = await page.locator('.question-card__text').textContent();
    await page.getByRole('button', { name: 'NIE MAM', exact: true }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Wyłączyć to pytanie?' });
    await expect(dialog).toContainText(question);
    await shoot(page, 'series-na-dialog');
    await dialog.getByRole('button', { name: 'Zostaw' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('.question-card__text')).toHaveText(question);
    expect((await stored(page)).history.answers).toEqual([]);

    await page.getByRole('button', { name: 'NIE MAM', exact: true }).click();
    await dialog.getByRole('button', { name: 'Wyłącz' }).click();
    await expect(page.locator('.topbar h1')).toHaveText('Pytanie 2');
    expect((await stored(page)).history.answers.map((a) => a.kind)).toEqual(['NOT_APPLICABLE']);
  });

  test('a walk card when the series moves to another room, without a count', async ({ page }) => {
    await seedHome(page, { kinds: ['TOILET', 'BALCONY'], ageDays: 20 });
    await page.getByRole('button', { name: 'Daj mi zadanie' }).click();
    let walked = false;
    for (let i = 0; i < 40 && !walked; i++) {
      await settled(page);
      if ((await root(page).getAttribute('data-mode')) !== 'asking') break;
      if (await page.locator('.screen[data-moving="true"]').count()) {
        walked = true;
        await expect(page.locator('.move-card .pill')).toHaveCount(0);
        await page.getByRole('button', { name: 'Dalej' }).click();
        await expect(page.locator('.screen[data-moving="false"]')).toBeVisible();
      } else {
        await answer(page, 'TAK');
      }
    }
    expect(walked).toBe(true);
  });

  test('the stopwatch keeps counting through a reload', async ({ page }) => {
    await seedHome(page, { kinds: ['KITCHEN'], ageDays: 5 });
    await page.getByRole('button', { name: 'Daj mi zadanie' }).click();
    await page.getByRole('button', { name: 'NIE', exact: true }).click();
    await page.getByRole('button', { name: 'Start' }).click();
    await mode(page, 'timing');
    await editStored(page, (state) => ({ activity: { ...state.activity, startedAt: state.activity.startedAt - 125_000 } }));
    await page.reload();
    await mode(page, 'timing');
    await expect(page.locator('.stopwatch__clock')).toHaveText(/^2:0\d$/);
  });

  test('a question left for 15 minutes is closed when the app opens, no penalty', async ({ page }) => {
    await seedHome(page, { kinds: ['KITCHEN'], ageDays: 5 });
    await page.getByRole('button', { name: 'Daj mi zadanie' }).click();
    await mode(page, 'asking');
    await editStored(page, (state) => ({ activity: { ...state.activity, series: { ...state.activity.series, lastInteractionAt: Date.now() - 16 * 60_000 } } }));
    await page.reload();
    await mode(page, 'idle');
    await expect(page.getByRole('heading', { name: 'Na razie spokój' })).toBeVisible();
    const { history } = await stored(page);
    expect(history.answers.map((a) => a.kind)).toEqual(['STOP']);
    expect(history.series[0]).toMatchObject({ abandoned: true });
  });
});

test.describe('screenshots', () => {
  for (const theme of ['light', 'dark']) {
    test(`home and series, ${theme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await seedHome(page, { kinds: ['KITCHEN', 'BATHROOM', 'BEDROOM'], ageDays: 5 });
      await editStored(page, (state, entry) => ({ log: [entry] }), doneEntry(DAY + 3 * HOUR + 60_000));
      await page.reload();
      await page.waitForTimeout(400);
      await shoot(page, `home-idle-${theme}`);
      await page.getByRole('button', { name: 'Daj mi zadanie' }).click();
      await mode(page, 'asking');
      await page.waitForTimeout(500);
      await shoot(page, `series-question-${theme}`);
      await page.getByRole('button', { name: 'NIE', exact: true }).click();
      await mode(page, 'offering');
      await shoot(page, `series-offer-${theme}`);
      await page.getByRole('button', { name: 'Start' }).click();
      await mode(page, 'timing');
      await editStored(page, (state) => ({ activity: { ...state.activity, startedAt: state.activity.startedAt - 247_000 } }));
      await page.reload();
      await mode(page, 'timing');
      await shoot(page, `stopwatch-${theme}`);
      await page.getByRole('button', { name: 'ZROBIONE' }).click();
      await page.locator('.reward').waitFor();
      await page.waitForTimeout(900);
      await shoot(page, `reward-${theme}`);
    });
  }
});
