// Developer mode (specification 13.4). The tests run on 127.0.0.1, the development server, so it is on.

import { test, expect, shoot } from './fixtures.js';
import { seedHome, stored } from './app.js';

test.use({ locale: 'pl-PL' });

const DAY = 86_400_000;

async function openDev(page) {
  await page.getByRole('button', { name: 'Ustawienia' }).click();
  await page.getByRole('button', { name: /Tryb deweloperski/ }).click();
  await expect(page.getByRole('heading', { name: 'Tryb deweloperski', level: 1 })).toBeVisible();
}

const lastCleanAt = async (page, key) => (await stored(page)).household.instances[key].lastCleanAt;

test.describe('developer mode', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'redmi', 'Once is enough.'));

  test('the time shift ages the questions, but not while something is going on', async ({ page }) => {
    await seedHome(page, { kinds: ['KITCHEN'], ageDays: 5 });
    const key = 'kitchen_counter_clean@room#1';
    const before = await lastCleanAt(page, key);
    await openDev(page);
    await page.getByRole('button', { name: '+1 dzień' }).click();
    await expect(page.getByRole('status')).toHaveText('Pytania są starsze o dzień.');
    expect(await lastCleanAt(page, key)).toBe(before - DAY);
    const { history } = await stored(page);
    expect(history.answers).toEqual([]);

    await page.goto('./#/');
    await page.getByRole('button', { name: 'Daj mi zadanie' }).click();
    await expect(page.locator('.home-root')).toHaveAttribute('data-mode', 'asking');
    await page.goto('./#/settings/dev');
    await page.getByRole('button', { name: '+1 tydzień' }).click();
    await expect(page.getByRole('status')).toHaveText('Coś trwa: najpierw zakończ serię, zadanie albo Obchód.');
    expect(await lastCleanAt(page, key)).toBe(before - DAY);
  });

  test('the season month decides the seasonal questions; the pool preview puts the pool first', async ({ page }) => {
    await seedHome(page, { kinds: ['KITCHEN', 'BALCONY'], ageDays: 5 });
    await openDev(page);
    const months = page.getByRole('radiogroup', { name: 'Miesiąc sezonów' }).getByRole('radio');
    await expect(months).toHaveCount(13);
    await expect(page.getByText(/^Sezony według prawdziwego miesiąca: /)).toBeVisible();
    const snow = page.locator('.pool-row[data-key="balcony_snow@room#2"]');

    await months.nth(1).click();
    await expect(page.getByText('Sezony jak w miesiącu: styczeń')).toBeVisible();
    await page.getByRole('button', { name: /Podgląd puli/ }).click();
    await expect(page.getByRole('heading', { name: 'Podgląd puli', level: 1 })).toBeVisible();
    await expect(snow).toHaveCount(1);
    await expect(snow).toContainText(/^Balkon.+co\s\d+(,\d)?\sdni\S* · przeterminowanie\s[\d,]+ · waga\s[\d,]+ · [\d,]+\smin$/);
    const pools = await page.locator('.pool-row').evaluateAll((rows) => rows.map((r) => r.dataset.pool));
    expect(pools.indexOf('false')).toBeGreaterThan(0);
    expect(pools.slice(pools.indexOf('false'))).not.toContain('true');
    await expect(page.locator('.settings__heading').first()).toHaveText(/^\d+ pyta\S* w puli$/);
    await shoot(page, 'dev-pool');

    await page.goBack();
    await months.nth(7).click();
    await page.getByRole('button', { name: /Podgląd puli/ }).click();
    await expect(page.locator('.pool-row').first()).toBeVisible();
    await expect(snow).toHaveCount(0);
  });

  test('the theme switches at once and stays after a reload; the language reloads the app', async ({ page }) => {
    await seedHome(page, { kinds: ['KITCHEN'] });
    await openDev(page);
    const themes = page.getByRole('radiogroup', { name: 'Motyw' });
    await themes.getByRole('radio', { name: 'Ciemny' }).click();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
    await page.reload();
    await page.waitForSelector('body[data-ready]');
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
    await expect(themes.getByRole('radio', { name: 'Ciemny' })).toHaveAttribute('aria-checked', 'true');
    await themes.getByRole('radio', { name: 'Systemowy' }).click();
    expect(await page.evaluate(() => document.documentElement.dataset.theme ?? null)).toBeNull();

    await page.getByRole('radiogroup', { name: 'Język' }).getByRole('radio', { name: 'English' }).click();
    await expect(page.getByRole('heading', { name: 'Developer mode', level: 1 })).toBeVisible();
    expect((await stored(page)).settings.language).toBe('en');
  });

  test('a pretend last cleaning shows every variant of the home screen line', async ({ page }) => {
    await seedHome(page, { kinds: ['KITCHEN'] });
    await openDev(page);
    const lasts = page.getByRole('radiogroup', { name: 'Ostatnie sprzątanie' });
    const preview = page.locator('.dev__preview');
    await expect(preview).toHaveText('(nic, jeszcze żadnego zadania)');
    for (const [choice, line] of [
      ['Godzinę temu', 'Ostatnie sprzątanie: 1 godzinę temu'],
      ['2 dni temu', 'Ostatnie sprzątanie: 2 dni temu'],
      ['2 tygodnie temu', 'Miło znowu widzieć. Zacznijmy od czegoś małego.'],
    ]) {
      await lasts.getByRole('radio', { name: choice }).click();
      await expect(preview).toHaveText(line);
    }
    await page.goto('./#/');
    await expect(page.locator('.home__past')).toHaveText('Miło znowu widzieć. Zacznijmy od czegoś małego.');
    await page.goto('./#/settings/dev');
    await lasts.getByRole('radio', { name: 'Prawdziwe' }).click();
    await expect(preview).toHaveText('(nic, jeszcze żadnego zadania)');
  });
});

test.describe('screenshots', () => {
  for (const theme of ['light', 'dark']) {
    test(`developer mode, ${theme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await seedHome(page, { kinds: ['KITCHEN', 'BEDROOM'], ageDays: 3 });
      await openDev(page);
      await page.waitForTimeout(300);
      await shoot(page, `dev-${theme}`, { fullPage: true });
      await page.getByRole('button', { name: /Podgląd puli/ }).click();
      await expect(page.locator('.pool-row').first()).toBeVisible();
      await shoot(page, `dev-pool-${theme}`);
    });
  }
});
