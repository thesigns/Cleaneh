// The big clean (specification 4.4).

import { test, expect, shoot } from './fixtures.js';
import { seedHome, stored } from './app.js';

test.use({ locale: 'pl-PL' });
test.describe.configure({ timeout: 90_000 });

const HOME = { kinds: ['KITCHEN', 'BATHROOM', 'BEDROOM'], features: ['DISHWASHER'], ageDays: 5 };
const root = (page) => page.locator('.home-root');

async function openClean(page) {
  await page.getByRole('button', { name: 'Porządki' }).click();
  await expect(page.getByRole('heading', { name: 'Generalne porządki' })).toBeVisible();
}

/** Starts a big clean with a budget. */
async function start(page, budget = '30 min') {
  await openClean(page);
  await page.getByRole('radio', { name: budget }).click();
  await expect(page.locator('.clean__plan')).toContainText(/pyta/);
  await page.getByRole('button', { name: 'Zaczynamy' }).click();
  await expect(root(page)).toHaveAttribute('data-clean', 'true');
}

/** Goes on one step: past the walk card, a block reward, or answers YES. Returns what it did. */
async function stepOn(page) {
  await expect(root(page)).not.toHaveAttribute('data-busy', 'true');
  const reward = page.locator('.reward');
  if (await reward.count()) {
    const title = await reward.locator('.reward__title').textContent();
    await reward.getByRole('button').first().click();
    await expect(reward).toHaveCount(0);
    return `reward:${title}`;
  }
  if ((await root(page).getAttribute('data-mode')) !== 'asking') return 'end';
  if ((await page.locator('.screen[data-moving]').getAttribute('data-moving')) === 'true') {
    await page.getByRole('button', { name: 'Dalej' }).click();
    await expect(page.locator('.screen[data-moving="false"]')).toBeVisible();
    return 'walk';
  }
  // The card flies off before the answer is saved: wait for "N of M" to move on (or the end, or a reward).
  const before = await page.locator('.clean-bar__sub').textContent();
  await page.getByRole('button', { name: 'TAK', exact: true }).click();
  await expect(async () => {
    const state = await page.evaluate(() => ({
      sub: document.querySelector('.clean-bar__sub')?.textContent ?? null,
      reward: Boolean(document.querySelector('.reward')),
      busy: document.querySelector('.home-root')?.dataset.busy === 'true',
    }));
    expect(!state.busy && (state.reward || state.sub !== before)).toBe(true);
  }).toPass();
  return 'yes';
}

test.describe('big clean', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'redmi', 'Once is enough.'));

  test('the setup screen: one hour by default, areas with something to do, the plan', async ({ page }) => {
    await seedHome(page, HOME);
    await openClean(page);
    await expect(page.getByRole('radio', { name: '1 h' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('checkbox')).toHaveCount(3);
    for (const box of await page.getByRole('checkbox').all()) await expect(box).toBeChecked();
    const hour = await page.locator('.clean__plan').textContent();
    expect(hour).toMatch(/^\d+ pyta\S*, najwyżej (\d+ min|1 h( \d+ min)?) pracy$/);
    await page.getByRole('radio', { name: 'Bez limitu' }).click();
    await expect(page.locator('.clean__plan')).not.toHaveText(hour);
    for (const box of await page.getByRole('checkbox').all()) await box.uncheck();
    await expect(page.getByText('Tu nie ma nic do zrobienia: wszystko było sprzątane w ostatniej dobie.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zaczynamy' })).toBeDisabled();
  });

  test('through the whole plan: walk cards with time, block rewards, the final reward', async ({ page }) => {
    await seedHome(page, HOME);
    await start(page);
    // A walk card before the first question, with the room's upper bound of time.
    await expect(page.locator('.screen[data-moving="true"]')).toBeVisible();
    await expect(page.locator('.move-card .pill')).toHaveText(/^do \d+ min$/);
    await expect(page.locator('.clean-bar__sub')).toHaveText(/^Generalne porządki · 1 z \d+$/);
    await expect(page.locator('.clean-bar__progress')).toContainText(/zostało do \d+ min/);

    const seen = [];
    for (let i = 0; i < 80; i++) {
      const what = await stepOn(page);
      seen.push(what);
      if (what.startsWith('reward:Generalne porządki zrobione!')) break;
    }
    const rewards = seen.filter((s) => s.startsWith('reward:'));
    expect(rewards.length).toBeGreaterThan(1);
    expect(rewards.at(-1)).toBe('reward:Generalne porządki zrobione!');
    expect(rewards.slice(0, -1).every((r) => /gotowe!|Dobry początek!/.test(r))).toBe(true);
    await expect(root(page)).toHaveAttribute('data-mode', 'idle');
    const { history } = await stored(page);
    expect(history.series).toEqual([expect.objectContaining({ clean: true, cleanFinished: true })]);
  });

  test('X before any answer: no reward, back home', async ({ page }) => {
    await seedHome(page, HOME);
    await start(page);
    await page.getByRole('button', { name: 'Zakończ' }).click();
    await expect(root(page)).toHaveAttribute('data-mode', 'idle');
    await expect(page.locator('.reward')).toHaveCount(0);
    // Home is the app's first history entry: Back there closes the app (9.5).
    expect(await page.evaluate(() => history.state.depth)).toBe(0);
  });

  test('"Enough for now" on a block reward ends with the final reward', async ({ page }) => {
    await seedHome(page, HOME);
    await start(page);
    for (let i = 0; i < 40 && !(await page.locator('.reward').count()); i++) await stepOn(page);
    await expect(page.locator('.reward--lavender')).toBeVisible();
    await shoot(page, 'clean-block-reward');
    await page.getByRole('button', { name: 'Na razie wystarczy' }).click();
    // The block's reward is still fading out while the final one comes.
    const final = page.locator('.reward:not(.reward--leaving)');
    await expect(final.locator('.reward__title')).toHaveText('Kawał dobrej roboty!');
    await expect(final).toContainText(/Sprawdzone miejsca: \d+/);
    await final.getByRole('button', { name: 'Gotowe' }).click();
    await expect(root(page)).toHaveAttribute('data-mode', 'idle');
  });
});

test.describe('screenshots', () => {
  for (const theme of ['light', 'dark']) {
    test(`big clean, ${theme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await seedHome(page, HOME);
      await page.waitForTimeout(300);
      await shoot(page, `clean-home-${theme}`);
      await openClean(page);
      await shoot(page, `clean-setup-${theme}`);
      await page.getByRole('button', { name: 'Zaczynamy' }).click();
      await expect(page.locator('.screen[data-moving="true"]')).toBeVisible();
      await page.waitForTimeout(500);
      await shoot(page, `clean-walk-${theme}`);
      await page.getByRole('button', { name: 'Dalej' }).click();
      await expect(page.locator('.screen[data-moving="false"]')).toBeVisible();
      await page.waitForTimeout(500);
      await shoot(page, `clean-question-${theme}`);
    });
  }
});
