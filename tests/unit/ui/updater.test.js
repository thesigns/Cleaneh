import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AWAY_MS, CHECK_EVERY_MS, createUpdater } from '../../../src/ui/service-worker.js';

/** A service worker container and registration that record what the updater does. */
function setup({ controller = {}, waiting = false, idle = true } = {}) {
  const calls = { skipWaiting: 0, reloads: 0, updates: 0 };
  const registration = {
    waiting: waiting ? { postMessage: (message) => message.type === 'SKIP_WAITING' && calls.skipWaiting++ } : null,
    update: async () => calls.updates++,
  };
  const container = Object.assign(new EventTarget(), { controller, register: async () => registration });
  const clock = { time: 1_000_000, now: () => clock.time };
  const state = { idle };
  const updater = createUpdater({ isIdle: async () => state.idle, container, reload: () => calls.reloads++, clock });
  const takeOver = () => container.dispatchEvent(new Event('controllerchange'));
  return { updater, registration, container, clock, state, calls, takeOver };
}

test('opening the app with a waiting version switches to it and reloads once it takes over', async () => {
  const { updater, calls, takeOver } = setup({ waiting: true });
  await updater.register();
  assert.equal(await updater.applyIfIdle(), true);
  assert.equal(calls.skipWaiting, 1);
  assert.equal(calls.reloads, 0);
  takeOver();
  assert.equal(calls.reloads, 1);
  assert.equal(await updater.applyIfIdle(), false, 'asked once');
});

test('never in the middle of something: the version keeps waiting', async () => {
  const { updater, calls } = setup({ waiting: true, idle: false });
  await updater.register();
  assert.equal(await updater.applyIfIdle(), false);
  assert.equal(calls.skipWaiting, 0);
});

test('nothing waiting: nothing happens', async () => {
  const { updater, calls } = setup();
  await updater.register();
  assert.equal(await updater.applyIfIdle(), false);
  assert.deepEqual(calls, { skipWaiting: 0, reloads: 0, updates: 0 });
});

test('coming back after a while counts as opening; a short look away does not', async () => {
  const { updater, clock, calls } = setup({ waiting: true });
  await updater.register();
  updater.hidden();
  clock.time += AWAY_MS - 1;
  assert.equal(await updater.visible(), false);
  assert.equal(calls.skipWaiting, 0);
  updater.hidden();
  clock.time += AWAY_MS;
  assert.equal(await updater.visible(), true);
  assert.equal(calls.skipWaiting, 1);
});

test('coming back looks for a new version now and then', async () => {
  const { updater, clock, calls } = setup();
  await updater.register();
  updater.hidden();
  clock.time += AWAY_MS;
  await updater.visible();
  assert.equal(calls.updates, 0, 'just registered: the browser has just looked');
  updater.hidden();
  clock.time += CHECK_EVERY_MS;
  await updater.visible();
  assert.equal(calls.updates, 1);
  updater.hidden();
  clock.time += 1000;
  await updater.visible();
  assert.equal(calls.updates, 1);
});

test('another tab switched the version: this one reloads at its next opening, not in the middle of something', async () => {
  const { updater, clock, state, calls, takeOver } = setup();
  await updater.register();
  state.idle = false;
  takeOver();
  assert.equal(calls.reloads, 0);
  updater.hidden();
  clock.time += AWAY_MS;
  assert.equal(await updater.visible(), false);
  state.idle = true;
  updater.hidden();
  clock.time += AWAY_MS;
  assert.equal(await updater.visible(), true);
  assert.equal(calls.reloads, 1);
});

test('the first install takes over without a reload', async () => {
  const { updater, calls, takeOver } = setup({ controller: null });
  await updater.register();
  takeOver();
  assert.equal(calls.reloads, 0);
  assert.equal(await updater.applyIfIdle(), false);
});
