// Helpers for tests of the app itself: open it, put data in, read what is stored.

/** Opens the app at a path ('/', '/sweep/first') and waits until it is ready. */
export async function openApp(page, path = '/') {
  await page.goto(`./#${path}`);
  await page.waitForSelector('body[data-ready]');
}

/**
 * Sets up the home the way Settings would: rooms of these kinds and switches on. Runs app modules in the page,
 * on the app's own database. Then reopens the app at `path`.
 */
export async function seedHome(page, { kinds = [], features = [], ageDays = 0 }, path = '/') {
  await openApp(page);
  await page.evaluate(
    async ({ kinds, features, ageDays }) => {
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
      engine.close();
      store.close();
    },
    { kinds, features, ageDays },
  );
  await openApp(page, path);
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
