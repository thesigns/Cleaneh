// The setup (specification 10) with the room editor (7.5) and the switches (7.6).

import { test, expect, shoot } from './fixtures.js';
import { openApp, stored } from './app.js';

test.use({ locale: 'pl-PL' });

const next = (page) => page.getByRole('button', { name: 'Dalej', exact: true });

/** Adds a room in the editor: kind, optionally a name and a color (1–7). */
async function addRoom(page, kind, { name = null, color = null } = {}) {
  await page.getByRole('button', { name: 'Nowe pomieszczenie' }).click();
  const editor = page.getByRole('dialog', { name: 'Nowe pomieszczenie' });
  await expect(editor.getByRole('button', { name: 'Dodaj' })).toBeDisabled();
  await editor.getByRole('radio', { name: new RegExp(`^${kind}`) }).click();
  if (name) await editor.getByLabel('Nazwa (nieobowiązkowa)').fill(name);
  if (color) await editor.getByRole('radio', { name: `Kolor ${color}` }).click();
  await editor.getByRole('button', { name: 'Dodaj' }).click();
  await expect(editor).toHaveCount(0);
}

/** Answers the whole first Sweep with YES. */
async function sweepThrough(page) {
  const screen = page.locator('.screen[data-step]');
  await screen.waitFor();
  while (await screen.count()) {
    if ((await screen.getAttribute('data-moving')) === 'true') {
      await page.getByRole('button', { name: 'Dalej' }).click();
      await expect(screen).toHaveAttribute('data-moving', 'false');
      continue;
    }
    const step = Number(await screen.getAttribute('data-step'));
    await page.getByRole('button', { name: 'TAK', exact: true }).click();
    // The last answer ends the Sweep and leads on to the next step of the setup, so the screen may be gone:
    // read it in one go (a locator would wait for it to come back).
    await expect(async () => {
      const value = await page.evaluate(() => document.querySelector('.screen[data-step]')?.dataset.step ?? null);
      if (value !== null) expect(Number(value)).toBe(step + 1);
    }).toPass({ timeout: 15_000 });
  }
}

// Going through a whole first Sweep takes a while with several browsers at once.
test.describe.configure({ timeout: 90_000 });

test.describe('setup', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'redmi', 'Once is enough.'));

  test('from the welcome to the home screen: rooms, switches, first Sweep, home screen prompt, summary', async ({ page }) => {
    await openApp(page);
    await expect(page).toHaveURL(/#\/setup\/welcome$/);
    await expect(page.getByRole('heading', { name: 'Cześć! Tu Cleaneh' })).toBeVisible();
    await page.getByRole('button', { name: 'Zaczynamy' }).click();

    await expect(page.getByRole('heading', { name: 'Twoje pomieszczenia' })).toBeVisible();
    await expect(next(page)).toBeDisabled();
    await addRoom(page, 'Kuchnia');
    await addRoom(page, 'Sypialnia', { name: 'Gościnny', color: 5 });
    await expect(page.locator('.room-row')).toHaveText([/Kuchnia/, /Gościnny\s*Sypialnia/]);
    await next(page).click();

    await expect(page.getByRole('heading', { name: 'Sprzęty i domownicy' })).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Kot' })).toHaveCount(0);
    await page.getByRole('switch', { name: 'Zwierzęta' }).check();
    await page.getByRole('switch', { name: 'Kot' }).check();
    await page.getByRole('switch', { name: 'Zmywarka' }).check();
    await next(page).click();

    await expect(page).toHaveURL(/#\/sweep\/first$/);
    await sweepThrough(page);
    // Chromium in tests has no install prompt: the hint for other browsers, and Skip.
    await expect(page.getByRole('heading', { name: 'Na ekranie głównym' })).toBeVisible();
    await page.getByRole('button', { name: 'Pomiń' }).click();
    await expect(page.getByRole('heading', { name: 'Obchód zaliczony!' })).toBeVisible();
    await page.getByRole('button', { name: 'Gotowe' }).click();

    await expect(page.locator('.home-root[data-mode="idle"]')).toBeVisible();
    const state = await stored(page);
    expect(state.settings).toMatchObject({ onboarding: 'done', installPromptShown: true, firstSummary: null });
    expect(state.household.home.rooms.map((r) => [r.kind, r.name, r.color])).toEqual([['KITCHEN', null, 0], ['BEDROOM', 'Gościnny', 4]]);
    expect(state.household.home.features.sort()).toEqual(['CAT', 'DISHWASHER', 'PET']);
    expect(state.history.sweeps).toEqual([expect.objectContaining({ scope: 'first', completed: true })]);
    // Home is the app's first history entry: Back there closes the app (9.5).
    expect(await page.evaluate(() => history.state.depth)).toBe(0);
  });

  test('an interrupted setup comes back in the same step; the first Sweep resumes', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Zaczynamy' }).click();
    await addRoom(page, 'Łazienka');
    await next(page).click();
    await page.reload();
    await expect(page).toHaveURL(/#\/setup\/features$/);
    await next(page).click();
    await page.getByRole('button', { name: 'Dalej' }).click(); // the walk card
    await page.getByRole('button', { name: 'TAK', exact: true }).click();
    await expect(page.locator('.screen[data-step="1"]')).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(/#\/sweep\/first$/);
    await expect(page.locator('.screen[data-step="1"]')).toBeVisible();
  });

  test('Back goes one step back; X in the first Sweep goes back to the switches', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Zaczynamy' }).click();
    await addRoom(page, 'Kuchnia');
    await next(page).click();
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Twoje pomieszczenia' })).toBeVisible();
    await next(page).click();
    await next(page).click();
    await expect(page).toHaveURL(/#\/sweep\/first$/);
    await page.getByRole('button', { name: 'Przerwij Obchód' }).click();
    await expect(page.getByRole('heading', { name: 'Sprzęty i domownicy' })).toBeVisible();
  });

  test('after the first Sweep the steps before it do not come back', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Zaczynamy' }).click();
    await addRoom(page, 'Toaleta');
    await next(page).click();
    await next(page).click();
    await sweepThrough(page);
    await expect(page.getByRole('heading', { name: 'Na ekranie głównym' })).toBeVisible();
    await page.goto('./#/setup/features');
    await expect(page).toHaveURL(/#\/setup\/install$/);
  });

  test('the room editor: default names, editing, removing with a question, the last room stays', async ({ page }) => {
    await openApp(page, '/setup/rooms');
    await page.getByRole('button', { name: 'Nowe pomieszczenie' }).click();
    const editor = page.getByRole('dialog');
    await editor.getByRole('radio', { name: /^Sypialnia/ }).click();
    await expect(editor.getByText('Domyślnie: Sypialnia')).toBeVisible();
    await editor.getByRole('button', { name: 'Dodaj' }).click();
    await addRoom(page, 'Sypialnia');
    await expect(page.locator('.room-row')).toHaveText([/^Sypialnia$/, /^Sypialnia 2$/]);

    // Edit: a new name and kind; the color stays.
    await page.locator('.room-row').nth(1).click();
    const edit = page.getByRole('dialog', { name: 'Zmień pomieszczenie' });
    await edit.getByLabel('Nazwa (nieobowiązkowa)').fill('Pracownia');
    await edit.getByRole('radio', { name: /^Gabinet/ }).click();
    await edit.getByRole('button', { name: 'Zapisz' }).click();
    await expect(page.locator('.room-row').nth(1)).toHaveText(/Pracownia\s*Gabinet/);
    let rooms = (await stored(page)).household.home.rooms;
    expect(rooms[1]).toMatchObject({ kind: 'STUDY', name: 'Pracownia', color: 1 });

    // Remove asks first; "Zostaw" keeps it.
    await page.locator('.room-row').nth(1).click();
    await page.getByRole('button', { name: 'Usuń' }).click();
    const confirm = page.getByRole('alertdialog', { name: 'Usunąć „Pracownia”?' });
    await confirm.getByRole('button', { name: 'Usuń' }).click();
    await expect(page.locator('.room-row')).toHaveCount(1);

    // The last room cannot go.
    await page.locator('.room-row').click();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Usuń' })).toBeDisabled();
    await expect(page.getByText('Co najmniej jedno pomieszczenie musi zostać.')).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    rooms = (await stored(page)).household.home.rooms;
    expect(rooms.map((r) => r.removed)).toEqual([false, true]);
  });

  test('a child switch keeps its state while its parent is off', async ({ page }) => {
    await openApp(page, '/setup/features');
    await page.getByRole('switch', { name: 'Zwierzęta' }).check();
    await page.getByRole('switch', { name: 'Pies' }).check();
    await page.getByRole('switch', { name: 'Zwierzęta' }).uncheck();
    await expect(page.getByRole('switch', { name: 'Pies' })).toHaveCount(0);
    await page.getByRole('switch', { name: 'Zwierzęta' }).check();
    await expect(page.getByRole('switch', { name: 'Pies' })).toBeChecked();
  });
});

test.describe('screenshots', () => {
  for (const theme of ['light', 'dark']) {
    test(`setup, ${theme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await openApp(page);
      await shoot(page, `setup-welcome-${theme}`);
      await page.getByRole('button', { name: 'Zaczynamy' }).click();
      await addRoom(page, 'Przedpokój');
      await addRoom(page, 'Kuchnia');
      await page.getByRole('button', { name: 'Nowe pomieszczenie' }).click();
      await page.getByRole('dialog').getByRole('radio', { name: /^Sypialnia/ }).click();
      await shoot(page, `setup-room-editor-${theme}`);
      await page.getByRole('dialog').getByRole('button', { name: 'Dodaj' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await shoot(page, `setup-rooms-${theme}`);
      await next(page).click();
      await page.getByRole('switch', { name: 'Zwierzęta' }).check();
      await page.getByRole('switch', { name: 'Pranie' }).check();
      await shoot(page, `setup-features-${theme}`);
      await next(page).click();
      await sweepThrough(page);
      await expect(page.getByRole('heading', { name: 'Na ekranie głównym' })).toBeVisible();
      await shoot(page, `setup-install-${theme}`);
    });
  }
});
