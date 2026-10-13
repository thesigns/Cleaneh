// The store in a real browser: IndexedDB, transactions, migrations (specification 13.3).
// Each Playwright test has a fresh browser context, so a fresh database.

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('tests/e2e/harness.html');
  await page.waitForFunction(() => window.T);
});

test('an empty database loads as a new app', async ({ page }) => {
  const state = await page.evaluate(async () => {
    const store = await T.openStore();
    return store.load();
  });
  expect(state).toEqual({
    household: { home: { rooms: [], features: [] }, instances: {} },
    activity: { kind: 'idle' },
    sweep: null,
    settings: { language: null, theme: null, sound: true, onboarding: 'welcome', installPromptShown: false },
  });
});

test('a commit saves the household, activity, Sweep and settings, and they load back', async ({ page }) => {
  const { saved, loaded } = await page.evaluate(async () => {
    const { home: h } = T;
    const store = await T.openStore();
    const before = (await store.load()).household;
    const home = h.withFeature(h.addRoom(h.addRoom(h.emptyHome(), 'KITCHEN', { name: 'Kuchnia u babci' }), 'ROOM'), 'CAR', true);
    const instances = {
      'kitchen_counter_clean@room#1': { interval: 2.6, lastCleanAt: T.T0, dirtySeenAfterDays: null, notApplicable: false, seasonStart: null, taskMinutes: 4.2, cleanedAt: T.T0 },
      'car_trash@group#CAR': { interval: 7, lastCleanAt: T.T0 - T.DAY_MS, dirtySeenAfterDays: 3.5, notApplicable: false, seasonStart: null, taskMinutes: null, cleanedAt: null },
    };
    const activity = { kind: 'asking', key: 'car_trash@group#CAR', series: { startedAt: T.T0, lastInteractionAt: T.T0, lastArea: null, skipped: [], answered: 0, tasksDone: 0, taskTimeMs: 0, clean: null } };
    const sweep = { scope: { kind: 'home' }, startedAt: T.T0, start: { home, instances }, keys: ['car_trash@group#CAR'], steps: [] };
    const settings = { ...T.DEFAULT_SETTINGS, language: 'pl', onboarding: 'done' };
    const saved = { household: { home, instances }, activity, sweep, settings };
    await store.commit({ before, after: saved.household, activity, sweep, settings });
    return { saved, loaded: await store.load() };
  });
  expect(loaded).toEqual(saved);
});

test('a later commit changes only what changed and removes dropped instances', async ({ page }) => {
  const instances = await page.evaluate(async () => {
    const store = await T.openStore();
    const empty = (await store.load()).household;
    const st = (interval) => ({ interval, lastCleanAt: T.T0, dirtySeenAfterDays: null, notApplicable: false, seasonStart: null, taskMinutes: null, cleanedAt: null });
    const first = { ...empty, instances: { 'a@room#1': st(1), 'b@room#1': st(2) } };
    await store.commit({ before: empty, after: first });
    const loaded = (await store.load()).household;
    await store.commit({ before: loaded, after: { ...loaded, instances: { 'a@room#1': loaded.instances['a@room#1'], 'c@room#1': st(3) } } });
    return (await store.load()).household.instances;
  });
  expect(Object.keys(instances).sort()).toEqual(['a@room#1', 'c@room#1']);
});

test('a failed commit writes nothing', async ({ page }) => {
  const { error, activity, answers } = await page.evaluate(async () => {
    const store = await T.openStore();
    let error = null;
    try {
      // A function cannot be stored: the whole transaction, the answer included, is rolled back.
      await store.commit({ log: [{ key: 'a@room#1', kind: 'YES', at: T.T0 }], activity: { kind: 'idle', broken: () => 1 } });
    } catch (e) {
      error = e.name;
    }
    return { error, activity: (await store.load()).activity, answers: (await store.history()).answers };
  });
  expect(error).toBe('DataCloneError');
  expect(activity).toEqual({ kind: 'idle' });
  expect(answers).toEqual([]);
});

test('history answers the home screen: the last DONE, today, the first Sweep', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const store = await T.openStore();
    const before = await store.firstSweepDone();
    await store.commit({
      log: [
        { key: 'a@room#1', kind: 'DONE', at: T.T0 - 3 * T.DAY_MS, taskTimeMs: 60000 },
        { key: 'b@room#1', kind: 'DONE', at: T.T0 - 1000, taskTimeMs: 120000 },
        { key: 'c@room#1', kind: 'YES', at: T.T0 },
      ],
      sweepRecord: { scope: 'first', area: null, startedAt: T.T0, endedAt: T.T0, answered: 3, completed: false },
    });
    const interrupted = await store.firstSweepDone();
    await store.commit({ sweepRecord: { scope: 'first', area: null, startedAt: T.T0, endedAt: T.T0, answered: 9, completed: true } });
    return {
      before,
      interrupted,
      after: await store.firstSweepDone(),
      lastDone: await store.lastDoneAt(),
      recent: (await store.doneSince(T.T0 - T.DAY_MS)).map((e) => e.key),
    };
  });
  expect(result).toEqual({ before: false, interrupted: false, after: true, lastDone: Date.parse('2026-07-01T08:00:00Z') - 1000, recent: ['b@room#1'] });
});

test('starting over deletes everything', async ({ page }) => {
  const after = await page.evaluate(async () => {
    const store = await T.openStore();
    const before = (await store.load()).household;
    await store.commit({
      before,
      after: { ...before, home: T.home.addRoom(before.home, 'ROOM') },
      activity: { kind: 'idle' },
      settings: { ...T.DEFAULT_SETTINGS, onboarding: 'done' },
      log: [{ key: 'a@room#1', kind: 'DONE', at: T.T0, taskTimeMs: 1 }],
    });
    await store.reset();
    return { state: await store.load(), history: await store.history() };
  });
  expect(after.state.household.home.rooms).toEqual([]);
  expect(after.state.settings.onboarding).toBe('welcome');
  expect(after.history).toEqual({ answers: [], series: [], sweeps: [] });
});

test.describe('migrations', () => {
  test('an old database is migrated and keeps its data', async ({ page }) => {
    const rooms = await page.evaluate(async () => {
      // Version 1 with a room, as an older app left it.
      const old = await T.openStore({ version: 1 });
      const before = (await old.load()).household;
      await old.commit({ before, after: { ...before, home: T.home.addRoom(before.home, 'BEDROOM') } });
      old.close();
      // A newer app: version 2 gives every room a `cleaned` flag.
      const migrations = {
        ...T.MIGRATIONS,
        2(db, transaction) {
          const request = transaction.objectStore('rooms').openCursor();
          request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor) return;
            cursor.update({ ...cursor.value, cleaned: false });
            cursor.continue();
          };
        },
      };
      const store = await T.openStore({ version: 2, migrations });
      return (await store.load()).household.home.rooms;
    });
    expect(rooms).toEqual([{ id: 1, kind: 'BEDROOM', number: 1, name: null, color: 0, removed: false, cleaned: false }]);
  });

  test('a missing migration fails and leaves the data as it was', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const old = await T.openStore({ version: 1 });
      const before = (await old.load()).household;
      await old.commit({ before, after: { ...before, home: T.home.addRoom(before.home, 'BEDROOM') } });
      old.close();
      let error = null;
      try {
        await T.openStore({ version: 3, migrations: { ...T.MIGRATIONS, 3() {} } });
      } catch (e) {
        error = e.message;
      }
      const again = await T.openStore({ version: 1 });
      return { error, rooms: (await again.load()).household.home.rooms.length };
    });
    expect(result).toEqual({ error: 'No migration to schema version 2', rooms: 1 });
  });

  test('data from a newer version of the app is not touched', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const newer = await T.openStore({ version: 2, migrations: { ...T.MIGRATIONS, 2() {} } });
      const before = (await newer.load()).household;
      await newer.commit({ before, after: { ...before, home: T.home.addRoom(before.home, 'BEDROOM') } });
      newer.close();
      let error = null;
      try {
        await T.openStore({ version: 1 });
      } catch (e) {
        error = e.name;
      }
      const again = await T.openStore({ version: 2, migrations: { ...T.MIGRATIONS, 2() {} } });
      return { error, rooms: (await again.load()).household.home.rooms.length };
    });
    expect(result).toEqual({ error: 'VersionError', rooms: 1 });
  });

  test('a tab with the old version steps aside for a newer one', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const old = await T.openStore({ version: 1 });
      let told = false;
      old.onVersionChange(() => (told = true));
      const store = await T.openStore({ version: 2, migrations: { ...T.MIGRATIONS, 2() {} } });
      return { told, loads: Boolean(await store.load()) };
    });
    expect(result).toEqual({ told: true, loads: true });
  });
});
