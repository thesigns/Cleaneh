// Settings (specification 5.2).

import { test, expect, shoot } from './fixtures.js';
import { editStored, seedHome, stored } from './app.js';

test.use({ locale: 'pl-PL' });

const openSettings = async (page) => {
  await page.getByRole('button', { name: 'Ustawienia' }).click();
  await expect(page.getByRole('heading', { name: 'Ustawienia', level: 1 })).toBeVisible();
};

test.describe('settings', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'redmi', 'Once is enough.'));

  test('rooms and switches use the same editors as the setup; Back returns to Settings', async ({ page }) => {
    await seedHome(page, { kinds: ['KITCHEN'] });
    await openSettings(page);
    await page.getByRole('button', { name: /Pomieszczenia/ }).click();
    await page.getByRole('button', { name: 'Nowe pomieszczenie' }).click();
    await page.getByRole('dialog').getByRole('radio', { name: /^Łazienka/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Dodaj' }).click();
    await expect(page.locator('.room-row')).toHaveText([/Kuchnia/, /Łazienka/]);
    await page.getByRole('button', { name: 'Wstecz' }).click();
    await page.getByRole('button', { name: /Sprzęty i domownicy/ }).click();
    await page.getByRole('switch', { name: 'Samochód' }).check();
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Ustawienia', level: 1 })).toBeVisible();
    const { household } = await stored(page);
    expect(household.home.rooms.map((r) => r.kind)).toEqual(['KITCHEN', 'BATHROOM']);
    expect(household.home.features).toEqual(['CAR']);
  });

  test('turned-off questions are listed by room and come back', async ({ page }) => {
    await seedHome(page, { kinds: ['KITCHEN'] });
    await editStored(page, (state) => {
      const key = 'kitchen_microwave@room#1';
      return { before: state.household, after: { ...state.household, instances: { ...state.household.instances, [key]: { ...state.household.instances[key], notApplicable: true } } } };
    });
    await page.reload();
    await openSettings(page);
    await expect(page.getByRole('button', { name: /Wyłączone pytania/ })).toContainText('1 pytanie');
    await page.getByRole('button', { name: /Wyłączone pytania/ }).click();
    await expect(page.locator('.settings__heading')).toHaveText(['Kuchnia']);
    await expect(page.locator('.off-row')).toContainText('Czy mikrofalówka jest czysta w środku?');
    await shoot(page, 'settings-off');
    await page.getByRole('button', { name: 'Przywróć' }).click();
    await expect(page.getByText('Żadne pytanie nie jest wyłączone.')).toBeVisible();
    expect((await stored(page)).household.instances['kitchen_microwave@room#1'].notApplicable).toBe(false);
  });

  test('the language: English, then the browser again', async ({ page }) => {
    await seedHome(page, { kinds: ['KITCHEN'] });
    await openSettings(page);
    await expect(page.getByRole('button', { name: /Język/ })).toContainText('Jak w przeglądarce');
    await page.getByRole('button', { name: /Język/ }).click();
    await page.getByRole('radio', { name: 'English' }).click();
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('en');
    await page.getByRole('button', { name: /Language/ }).click();
    await page.getByRole('radio', { name: 'Same as the browser' }).click();
    await expect(page.getByRole('heading', { name: 'Ustawienia', level: 1 })).toBeVisible();
    expect((await stored(page)).settings.language).toBeNull();
  });

  test('the theme: at once, before anything shows after a reload, in other tabs too', async ({ page, context }) => {
    // What the page looks like before the settings are read from the database.
    await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
      window.themeAtLoad = document.documentElement.dataset.theme ?? null;
      window.barAtLoad = [...document.querySelectorAll('meta[name="theme-color"]')].map((m) => m.media);
    }));
    await seedHome(page, { kinds: ['KITCHEN'] });
    const other = await context.newPage();
    await other.goto('./#/');
    await other.waitForSelector('body[data-ready]');
    await openSettings(page);
    const row = page.getByRole('button', { name: /Motyw/ });
    await expect(row).toContainText('Systemowy');
    await row.click();
    await page.getByRole('radio', { name: 'Ciemny' }).click();
    await expect(row).toContainText('Ciemny');
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
    await expect.poll(async () => (await stored(page)).settings.theme).toBe('dark');
    await expect.poll(() => other.evaluate(() => document.documentElement.dataset.theme ?? null)).toBe('dark');

    await page.reload();
    await page.waitForSelector('body[data-ready]');
    expect(await page.evaluate(() => [window.themeAtLoad, window.barAtLoad])).toEqual(['dark', ['not all', 'all']]);

    await row.click();
    await page.getByRole('radio', { name: 'Jasny' }).click();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
    await row.click();
    await page.getByRole('radio', { name: 'Systemowy' }).click();
    await expect(row).toContainText('Systemowy');
    expect(await page.evaluate(() => [document.documentElement.dataset.theme ?? null, [...document.querySelectorAll('meta[name="theme-color"]')].map((m) => m.media)])).toEqual([null, ['(prefers-color-scheme: light)', '(prefers-color-scheme: dark)']]);
    await expect.poll(async () => (await stored(page)).settings.theme).toBeNull();
    await expect.poll(() => other.evaluate(() => document.documentElement.dataset.theme ?? null)).toBeNull();
  });

  test('sound and vibration can be switched off', async ({ page }) => {
    await seedHome(page, { kinds: ['KITCHEN'] });
    await openSettings(page);
    await page.getByRole('switch', { name: /Dźwięk i wibracja/ }).uncheck();
    await expect.poll(async () => (await stored(page)).settings.sound).toBe(false);
  });

  test('installing shows how, when the browser has no install window', async ({ page }) => {
    await seedHome(page, { kinds: ['KITCHEN'] });
    await openSettings(page);
    await page.getByRole('button', { name: /Zainstaluj apkę/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Na ekranie głównym' });
    await expect(sheet).toContainText('Dodaj Cleaneh do ekranu głównego z menu przeglądarki.');
    await page.goBack();
    await expect(sheet).toHaveCount(0);
  });

  test('an install window that comes late is used; once installed, the offer goes', async ({ page }) => {
    await seedHome(page, { kinds: ['KITCHEN'] });
    await openSettings(page);
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      event.prompt = () => (window.prompted = true);
      event.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });
    await page.getByRole('button', { name: /Zainstaluj apkę/ }).click();
    await expect.poll(() => page.evaluate(() => window.prompted)).toBe(true);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
    await expect(page.getByRole('button', { name: /Zainstaluj apkę/ })).toHaveCount(0);
  });

  test('starting over asks, deletes everything but language, theme and sound, and goes back to the rooms', async ({ page }) => {
    await seedHome(page, { kinds: ['KITCHEN', 'BATHROOM'], ageDays: 3 });
    await editStored(page, (state) => ({ settings: { ...state.settings, sound: false, theme: 'dark' }, log: [{ key: 'kitchen_counter_clean@room#1', kind: 'DONE', at: Date.now(), taskTimeMs: 60000 }] }));
    await page.reload();
    await openSettings(page);
    await page.getByRole('button', { name: /Zacznij od nowa/ }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Zacząć od nowa?' });
    await dialog.getByRole('button', { name: 'Anuluj' }).click();
    expect((await stored(page)).household.home.rooms).toHaveLength(2);

    await page.getByRole('button', { name: /Zacznij od nowa/ }).click();
    await dialog.getByRole('button', { name: 'Usuń wszystko' }).click();
    await expect(page).toHaveURL(/#\/setup\/rooms$/);
    await expect(page.getByRole('heading', { name: 'Twoje pomieszczenia' })).toBeVisible();
    const state = await stored(page);
    expect(state.household.home.rooms).toEqual([]);
    expect(state.history).toEqual({ answers: [], series: [], sweeps: [] });
    expect(state.settings).toMatchObject({ onboarding: 'rooms', sound: false, theme: 'dark' });
    // Nothing to go back to from the setup.
    expect(await page.evaluate(() => history.state.depth)).toBe(0);
  });

  test('about: the version and the typeface license', async ({ page }) => {
    await seedHome(page, { kinds: ['KITCHEN'] });
    await openSettings(page);
    await expect(page.locator('.about')).toContainText(/Wersja 0\.1/);
    await page.getByRole('button', { name: 'Krój pisma Nunito, licencja SIL Open Font License' }).click();
    await expect(page.locator('.license')).toContainText('SIL OPEN FONT LICENSE');
  });
});

test.describe('screenshots', () => {
  for (const theme of ['light', 'dark']) {
    test(`settings, ${theme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await seedHome(page, { kinds: ['KITCHEN', 'BEDROOM'] });
      await openSettings(page);
      await page.waitForTimeout(300);
      await shoot(page, `settings-${theme}`);
    });
  }
});
