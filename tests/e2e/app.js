// Helpers for tests of the app itself: open it, put data in, read what is stored.

/** Opens the app at a path ('/', '/sweep/first') and waits until it is ready. */
export async function openApp(page, path = '/') {
  await page.goto(`./#${path}`);
  await page.waitForSelector('body[data-ready]');
}

/**
 * Sets up the home the way Settings would: rooms of these kinds and switches on, the setup done (unless
 * `setupDone` is false). Runs app modules in the page, on the app's own database. Then reopens the app at `path`.
 */
export async function seedHome(page, { kinds = [], features = [], ageDays = 0, setupDone = true }, path = '/') {
  await openApp(page);
  await page.evaluate(
    async ({ kinds, features, ageDays, setupDone }) => {
      const [{ openStore }, home, { createScheduler }, { fixedZone }, { createEngine }] = await Promise.all([
        import('./src/data/store.js'),
        import('./src/core/home.js'),
        import('./src/core/scheduler.js'),
        import('./src/core/time.js'),
        import('./src/engine/engine.js'),
      ]);
      const store = await openStore();
      const zone = fixedZone(0);
      const engine = createEngine({ store, scheduler: createScheduler({ zone }), zone, channelName: 'cleaneh-test' });
      await engine.updateHome((h) => {
        let next = kinds.reduce((acc, kind) => home.addRoom(acc, kind), h);
        for (const feature of features) next = home.withFeature(next, feature, true);
        return next;
      });
      // Right after setup nothing is due (staggered start, 8.1); let time pass when a test needs due questions.
      if (ageDays) await engine.age(ageDays * 86_400_000);
      // Tests of the app after the setup skip it (10).
      if (setupDone) await engine.updateSettings({ onboarding: 'done' });
      engine.close();
      store.close();
    },
    { kinds, features, ageDays, setupDone },
  );
  // A full reload, so the app reads the new state (a change of the address after '#' alone would not); then
  // the path, which the setup may have redirected away from before.
  await page.reload();
  await page.waitForSelector('body[data-ready]');
  await page.goto(`./#${path}`);
}

/** What is stored: activity, Sweep in progress, history. */
export function stored(page) {
  return page.evaluate(async () => {
    const { openStore } = await import('./src/data/store.js');
    const store = await openStore();
    const state = await store.load();
    const history = await store.history();
    store.close();
    return { ...state, history };
  });
}

/**
 * Changes what is stored, as if time had passed or history existed. `change(state, arg)` runs in the page with
 * the loaded state and returns a commit for the store (see src/data/store.js), or null.
 */
export async function editStored(page, change, arg = null) {
  await page.evaluate(
    async ({ source, arg }) => {
      const { openStore } = await import('./src/data/store.js');
      const store = await openStore();
      const state = await store.load();
      const commit = new Function('state', 'arg', `return (${source})(state, arg);`)(state, arg);
      if (commit) await store.commit(commit);
      store.close();
    },
    { source: change.toString(), arg },
  );
}

/** Deletes everything stored, like "Start over". */
export async function resetStored(page) {
  await page.evaluate(async () => {
    const { openStore } = await import('./src/data/store.js');
    const store = await openStore();
    await store.reset();
    store.close();
  });
}
