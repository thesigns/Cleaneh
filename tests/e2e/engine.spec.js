// The engine in a real browser: load, core, save; one at a time, also across tabs (specification 13.2, 4.3).

import { test, expect } from '@playwright/test';

async function harness(page) {
  await page.goto('tests/e2e/harness.html');
  await page.waitForFunction(() => window.T);
}

test.beforeEach(async ({ page }) => harness(page));

test('setup, first Sweep, a series with a task: what the home screen shows after', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { engine, clock } = await T.engineFor();
    const fresh = await engine.snapshot();

    await engine.updateHome((home) => T.home.addRoom(T.home.addRoom(home, 'KITCHEN'), 'BATHROOM'));
    let sweep = await engine.startFirstSweep();
    const cards = sweep.keys.length;
    let i = 0;
    while (sweep.steps.length < sweep.keys.length) sweep = await engine.answerSweep(i++ % 3 === 0 ? 'NO' : 'YES');
    const summary = await engine.finishSweep();
    const afterSweep = await engine.snapshot();

    // The Sweep summary offers a task: take it, finish it in 4 minutes.
    const key = summary.toStart[0];
    await engine.send({ kind: 'take', key });
    clock.advance(4 * T.MINUTE_MS);
    const done = await engine.send({ kind: 'done', key });
    const afterTask = await engine.snapshot();

    return {
      fresh: { firstSweepDone: fresh.firstSweepDone, since: fresh.sinceLastCleaning, today: fresh.today },
      cards,
      summary,
      firstSweepDone: afterSweep.firstSweepDone,
      instances: Object.keys(afterSweep.household.instances).length,
      sweepCleared: afterSweep.sweep === null,
      next: done.activity.kind,
      today: afterTask.today,
      since: afterTask.sinceLastCleaning,
    };
  });
  expect(result.fresh).toEqual({ firstSweepDone: false, since: { kind: 'never' }, today: { tasks: 0, taskTimeMs: 0 } });
  expect(result.cards).toBeGreaterThan(5);
  expect(result.summary.toStart.length).toBeGreaterThan(0);
  expect(result.firstSweepDone).toBe(true);
  expect(result.instances).toBeGreaterThan(result.cards); // the other questions got their staggered start
  expect(result.sweepCleared).toBe(true);
  expect(result.next).toBe('asking'); // the series goes on
  expect(result.today).toEqual({ tasks: 1, taskTimeMs: 4 * 60_000 });
  expect(result.since).toEqual({ kind: 'just-now' });
});

test('a Sweep answer is saved at once and undo takes it back', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { engine } = await T.engineFor();
    await engine.updateHome((home) => T.home.addRoom(home, 'ROOM'));
    const sweep = await engine.startFirstSweep();
    const key = sweep.keys[0];
    // Adding the room already gave every question its staggered start.
    const before = (await engine.snapshot()).household.instances[key];
    await engine.answerSweep('NO');
    const answered = (await engine.snapshot()).household.instances[key];
    await engine.undoSweep();
    const undone = (await engine.snapshot()).household.instances[key];
    const resumed = await engine.startFirstSweep();
    return {
      changed: answered.lastCleanAt !== before.lastCleanAt,
      undone: JSON.stringify(undone) === JSON.stringify(before),
      steps: resumed.steps.length,
      same: resumed.startedAt === sweep.startedAt,
    };
  });
  expect(result).toEqual({ changed: true, undone: true, steps: 0, same: true });
});

test('no Sweep while a series is going on', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { engine } = await T.engineFor();
    await engine.updateHome((home) => T.home.addRoom(home, 'KITCHEN'));
    const sweep = await engine.startFirstSweep();
    while ((await engine.snapshot()).sweep.steps.length < sweep.keys.length) await engine.answerSweep('NO');
    await engine.finishSweep();
    const step = await engine.send({ kind: 'request-task' });
    return { asking: step.activity.kind, sweep: await engine.startOnDemandSweep() };
  });
  expect(result).toEqual({ asking: 'asking', sweep: null });
});

test('opening the app after a break closes the series and records it', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { engine, store, clock } = await T.engineFor();
    await engine.updateHome((home) => T.home.addRoom(home, 'KITCHEN'));
    const sweep = await engine.startFirstSweep();
    while ((await engine.snapshot()).sweep.steps.length < sweep.keys.length) await engine.answerSweep('NO');
    await engine.finishSweep();
    const asked = await engine.send({ kind: 'request-task' });
    clock.advance(10 * T.MINUTE_MS);
    const soon = await engine.open();
    clock.advance(6 * T.MINUTE_MS);
    const later = await engine.open();
    const { answers, series } = await store.history();
    return { asked: asked.activity.key, soon: soon.activity.kind, later: later.activity.kind, last: answers.at(-1), series };
  });
  expect(result.soon).toBe('asking');
  expect(result.later).toBe('idle');
  expect(result.last).toMatchObject({ key: result.asked, kind: 'STOP' });
  expect(result.series).toHaveLength(1);
  expect(result.series[0]).toMatchObject({ abandoned: true, answered: 0 });
});

test('an event that does not fit changes nothing and writes nothing', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { engine, store } = await T.engineFor();
    let writes = 0;
    engine.onChange(() => writes++);
    const step = await engine.send({ kind: 'done', key: 'kitchen_counter_clean@room#1' });
    return { activity: step.activity.kind, writes, history: (await store.history()).answers.length };
  });
  expect(result).toEqual({ activity: 'idle', writes: 0, history: 0 });
});

test('settings are saved and merged', async ({ page }) => {
  const settings = await page.evaluate(async () => {
    const { engine } = await T.engineFor();
    await engine.updateSettings({ language: 'pl' });
    await engine.updateSettings({ sound: false });
    return (await engine.snapshot()).settings;
  });
  expect(settings).toEqual({ language: 'pl', sound: false, onboarding: 'welcome', installPromptShown: false });
});

test.describe('two tabs', () => {
  test('changes from both tabs go one after another, none is lost', async ({ page, context }) => {
    const other = await context.newPage();
    await harness(other);
    const addRooms = () =>
      (async () => {
        const { engine } = await T.engineFor();
        await Promise.all(Array.from({ length: 10 }, () => engine.updateHome((home) => T.home.addRoom(home, 'ROOM'))));
      })();
    await Promise.all([page.evaluate(addRooms), other.evaluate(addRooms)]);
    const ids = await page.evaluate(async () => (await (await T.engineFor()).engine.snapshot()).household.home.rooms.map((r) => r.id));
    expect(ids).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  test('the other tab hears about a change and sees it; its stale answer is ignored', async ({ page, context }) => {
    const other = await context.newPage();
    await harness(other);
    await other.evaluate(async () => {
      window.tab = await T.engineFor();
      window.heard = [];
      tab.engine.onChange((change) => heard.push(change));
    });

    const asked = await page.evaluate(async () => {
      const { engine } = await T.engineFor();
      await engine.updateHome((home) => T.home.addRoom(home, 'KITCHEN'));
      const sweep = await engine.startFirstSweep();
      while ((await engine.snapshot()).sweep.steps.length < sweep.keys.length) await engine.answerSweep('NO');
      await engine.finishSweep();
      return (await engine.send({ kind: 'request-task' })).activity.key;
    });

    await other.waitForFunction(() => heard.length > 0);
    const seen = await other.evaluate(async (key) => {
      const before = await tab.engine.snapshot();
      // This tab still shows the question; meanwhile the first tab answers it.
      return { fromOtherTab: heard.every((c) => c.fromOtherTab), activity: before.activity.kind, key: before.activity.key === key };
    }, asked);
    expect(seen).toEqual({ fromOtherTab: true, activity: 'asking', key: true });

    await page.evaluate(async (key) => {
      const { engine } = await T.engineFor();
      await engine.send({ kind: 'answer', key, answer: 'YES' });
    }, asked);
    const stale = await other.evaluate(async (key) => {
      const step = await tab.engine.send({ kind: 'answer', key, answer: 'NO' });
      const { answers } = await tab.store.history();
      return { kind: step.activity.kind, answersForKey: answers.filter((a) => a.key === key).map((a) => a.kind) };
    }, asked);
    // Sweep answers are not in the answer history; the first tab's YES is, the second tab's late NO is not.
    expect(stale.answersForKey).toEqual(['YES']);
    expect(stale.kind).not.toBe('offering');
  });
});
