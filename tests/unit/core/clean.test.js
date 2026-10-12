import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CATALOG, createCatalog, question } from '../../../src/core/catalog.js';
import { createPlanner, passed, startProgress, stop } from '../../../src/core/clean.js';
import { addRoom, areas, emptyHome, roomArea, withFeature } from '../../../src/core/home.js';
import { IDLE, createLoop } from '../../../src/core/loop.js';
import { seededRandom } from '../../../src/core/random.js';
import { createScheduler, instanceKey, parseKey } from '../../../src/core/scheduler.js';
import { HOUR_MS } from '../../../src/core/time.js';
import { T0, ZONE, days, minutes } from './support.js';

const catalog = createCatalog([
  question({ id: 'hall_floor', minutes: 5, days: 7, stage: 'FLOOR_WET', set: 'HALLWAY' }),
  question({ id: 'kitchen_trash', minutes: 3, days: 2, priority: 'HYGIENE', stage: 'FINISH', set: 'KITCHEN' }),
  question({ id: 'kitchen_mop', minutes: 10, days: 7, stage: 'FLOOR_WET', set: 'KITCHEN' }),
  question({ id: 'kitchen_counter', minutes: 5, days: 2, priority: 'HYGIENE', set: 'KITCHEN' }),
  question({ id: 'kitchen_clear', minutes: 5, days: 3, stage: 'TIDY', set: 'KITCHEN' }),
  question({ id: 'kitchen_dishwasher', minutes: 5, days: 1, requires: 'DISHWASHER', stage: 'START', set: 'KITCHEN' }),
  question({ id: 'bath_floor', minutes: 5, days: 7, priority: 'HYGIENE', stage: 'FLOOR_WET', set: 'BATHROOM' }),
  question({ id: 'bath_toilet', minutes: 5, days: 3, priority: 'HYGIENE', set: 'BATHROOM' }),
  question({ id: 'room_vacuum', minutes: 10, days: 7, stage: 'FLOOR_DRY', set: 'ROOM_BASE' }),
  question({ id: 'room_dust', minutes: 5, days: 14, stage: 'DUST', set: 'ROOM_BASE' }),
  question({ id: 'room_clothes', minutes: 5, days: 3, stage: 'TIDY', set: 'ROOM_BASE' }),
  question({ id: 'laundry_washer', minutes: 5, days: 3, stage: 'START', group: 'LAUNDRY' }),
]);
const scheduler = createScheduler({ zone: ZONE, catalog });
const planner = createPlanner(scheduler);
const loop = createLoop(scheduler);
const random = seededRandom(7);

let home = emptyHome();
for (const kind of ['ENTRYWAY', 'KITCHEN', 'BATHROOM', 'ROOM', 'ROOM']) home = addRoom(home, kind);
home = withFeature(withFeature(home, 'DISHWASHER', true), 'LAUNDRY', true);
const [hall, kitchen, bathroom, room1, room2] = [1, 2, 3, 4, 5].map(roomArea);
const all = areas(home);

/** Every instance `overdue(key)` intervals since its last clean. */
function household(overdue = () => 1) {
  const instances = {};
  for (const key of scheduler.keysFor(home)) {
    const interval = scheduler.question(key).days;
    instances[key] = { interval, lastCleanAt: T0 - days(interval * overdue(key)), dirtySeenAfterDays: null, notApplicable: false, seasonStart: null, taskMinutes: null, cleanedAt: null };
  }
  return { home, instances };
}

const change = (h, key, fields) => ({ ...h, instances: { ...h.instances, [key]: { ...h.instances[key], ...fields } } });
const then = (s, event, at = T0) => loop.reduce(s.household, s.activity, event, at, random);
const asked = (s) => {
  assert.equal(s.activity.kind, 'asking');
  return s.activity.key;
};
const answer = (s, given) => then(s, { kind: 'answer', key: asked(s), answer: given });
const ids = (keys) => keys.map((key) => parseKey(key).questionId);

test('order is start block, rooms, kitchen, bathroom, hall, rest, finish, by stage inside an area', () => {
  assert.deepEqual(planner.plan(household(), all, null, T0), [
    'kitchen_dishwasher@room#2',
    'laundry_washer@group#LAUNDRY',
    'room_clothes@room#4',
    'room_dust@room#4',
    'room_vacuum@room#4',
    'room_clothes@room#5',
    'room_dust@room#5',
    'room_vacuum@room#5',
    'kitchen_clear@room#2',
    'kitchen_counter@room#2',
    'kitchen_mop@room#2',
    'bath_toilet@room#3',
    'bath_floor@room#3',
    'hall_floor@room#1',
    'kitchen_trash@room#2',
  ]);
});

test('a stop is the question asked and the ones right after it in the same area', () => {
  const plan = planner.plan(household(), all, null, T0);
  const at = plan.findIndex((key) => key.endsWith(room1));
  const progress = { ...startProgress(plan), remaining: plan.slice(at + 1) };
  assert.deepEqual(ids(stop(progress, plan[at])), ['room_clothes', 'room_dust', 'room_vacuum']);
  assert.deepEqual(stop({ ...progress, remaining: [] }, plan.at(-1)), [plan.at(-1)]);
});

test('not-due questions are in, but recently cleaned and turned-off ones are out', () => {
  const counter = instanceKey('kitchen_counter', kitchen);
  const toilet = instanceKey('bath_toilet', bathroom);
  const floor = instanceKey('hall_floor', hall);
  let h = household(() => 0.2);
  h = change(h, counter, { cleanedAt: T0 - 3 * HOUR_MS });
  h = change(h, toilet, { cleanedAt: T0 - 30 * HOUR_MS });
  h = change(h, floor, { notApplicable: true });
  const plan = planner.plan(h, all, null, T0);
  assert.ok(!plan.includes(counter));
  assert.ok(plan.includes(toilet));
  assert.ok(!plan.includes(floor));
  assert.equal(plan.length, scheduler.keysFor(home).length - 2);
});

test('only the chosen areas', () => {
  assert.deepEqual(ids(planner.plan(household(), [bathroom], null, T0)), ['bath_toilet', 'bath_floor']);
});

test('the areas offered at the start are those with something to do', () => {
  let h = household();
  for (const key of scheduler.keysFor(home).filter((k) => k.endsWith(hall))) h = change(h, key, { cleanedAt: T0 - HOUR_MS });
  assert.deepEqual(planner.areasWithWork(h, all, T0), all.filter((area) => area !== hall));
});

test('a budget keeps the most urgent questions that fit, still in cleaning order', () => {
  // The neglected room first (4× overdue), then hygiene (counts triple), then the rest: 30 of the 88 minutes.
  const h = household((key) => (key.endsWith(room2) ? 4 : 1));
  const plan = planner.plan(h, all, minutes(30), T0);
  assert.ok(planner.minutes(h, plan) <= 30);
  assert.deepEqual(plan, ['room_clothes@room#5', 'room_dust@room#5', 'room_vacuum@room#5', 'kitchen_counter@room#2', 'kitchen_trash@room#2']);
});

test('the budget uses learned task times', () => {
  const vacuum = instanceKey('room_vacuum', room1);
  assert.equal(planner.minutes(change(household(), vacuum, { taskMinutes: 2 }), [vacuum]), 2);
});

test('the loop runs the plan in order, with a reward between blocks and a summary at the end', () => {
  const h = household();
  const plan = planner.plan(h, [kitchen, bathroom], null, T0);
  // dishwasher (start) | clear, counter, mop (kitchen) | toilet, floor (bathroom) | trash (finish)
  let s = loop.reduce(h, IDLE, { kind: 'start-clean', plan }, T0, random);
  assert.equal(s.activity.series.clean.total, 7);
  assert.equal(passed(s.activity.series.clean), 0);

  s = answer(s, 'YES');
  assert.equal(s.blockDone.block, 'start');
  assert.equal(parseKey(asked(s)).questionId, 'kitchen_clear');

  s = answer(s, 'NO');
  s = then(s, { kind: 'start', key: s.activity.key });
  s = then(s, { kind: 'done', key: s.activity.key }, T0 + minutes(4));
  assert.equal(s.blockDone, null);
  assert.equal(parseKey(asked(s)).questionId, 'kitchen_counter');
  assert.equal(s.activity.series.clean.blockTasks, 1);

  s = answer(s, 'NOT_NOW');
  s = answer(s, 'YES');
  assert.deepEqual(s.blockDone, { block: kitchen, tasks: 1, timeMs: minutes(4) });
  assert.equal(passed(s.activity.series.clean), 4);

  for (let i = 0; i < 3; i++) s = answer(s, 'YES');
  assert.equal(s.activity, IDLE);
  assert.equal(s.ended.clean, true);
  assert.equal(s.ended.cleanFinished, true);
  assert.equal(s.ended.tasksDone, 1);
});

test('X ends a big clean early', () => {
  const h = household();
  const stopped = then(loop.reduce(h, IDLE, { kind: 'start-clean', plan: planner.plan(h, all, null, T0) }, T0, random), { kind: 'stop' });
  assert.equal(stopped.ended.clean, true);
  assert.equal(stopped.ended.cleanFinished, false);
  assert.equal(stopped.ended.answered, 0, 'no reward when nothing was answered');
});

test('an empty plan says nothing to do, a busy loop ignores the start', () => {
  assert.equal(loop.reduce(household(), IDLE, { kind: 'start-clean', plan: [] }, T0, random).nothingDue, true);
  const h = household();
  const asking = loop.reduce(h, IDLE, { kind: 'start-clean', plan: planner.plan(h, all, null, T0) }, T0, random);
  assert.equal(then(asking, { kind: 'start-clean', plan: [instanceKey('hall_floor', hall)] }).activity, asking.activity);
});

test('opening the app waits through a 2-hour break in a big clean', () => {
  const h = household();
  const asking = loop.reduce(h, IDLE, { kind: 'start-clean', plan: planner.plan(h, all, null, T0) }, T0, random);
  assert.equal(then(asking, { kind: 'open' }, T0 + minutes(40)).activity, asking.activity);
  assert.equal(then(asking, { kind: 'open' }, T0 + minutes(119)).activity, asking.activity);
  const later = then(asking, { kind: 'open' }, T0 + minutes(120));
  assert.equal(later.activity, IDLE);
  assert.equal(later.ended.clean, true);
  assert.equal(later.ended.abandoned, true);
});

test('questions turned off on the way are passed over', () => {
  const h = household();
  const s = loop.reduce(h, IDLE, { kind: 'start-clean', plan: planner.plan(h, [bathroom, hall], null, T0) }, T0, random);
  assert.equal(parseKey(asked(answer(s, 'NOT_APPLICABLE'))).questionId, 'bath_floor');
});

test('YES and DONE mark a real clean, a staggered start and a Sweep NO do not', () => {
  const key = instanceKey('kitchen_counter', kitchen);
  const h = scheduler.refresh({ home, instances: {} }, T0, random);
  assert.equal(h.instances[key].cleanedAt, null);
  assert.equal(scheduler.answer(h, key, 'YES', T0).instances[key].cleanedAt, T0);
  assert.equal(scheduler.done(h, key, T0).instances[key].cleanedAt, T0);
  assert.equal(scheduler.sweepAnswer(h, key, 'YES', T0, false).instances[key].cleanedAt, T0);
  assert.equal(scheduler.sweepAnswer(h, key, 'NO', T0, false).instances[key].cleanedAt, null);
});

test('the catalog puts background work at the start and taking out at the end', () => {
  assert.equal(DEFAULT_CATALOG.get('laundry_washer_unloaded').stage, 'START');
  assert.equal(DEFAULT_CATALOG.get('kitchen_trash_out').stage, 'FINISH');
  assert.equal(DEFAULT_CATALOG.get('bath_floor').stage, 'FLOOR_WET');
  assert.equal(DEFAULT_CATALOG.get('room_clothes_away').stage, 'TIDY');
  const starts = DEFAULT_CATALOG.questions.filter((q) => q.stage === 'START').length;
  assert.ok(starts >= 3 && starts <= 10, `${starts} start questions`);
});

test('a whole-home plan on the real catalog keeps blocks together and stages in order', () => {
  const real = createScheduler({ zone: ZONE });
  const realPlanner = createPlanner(real);
  let house = emptyHome();
  for (const kind of ['ENTRYWAY', 'KITCHEN', 'BATHROOM', 'TOILET', 'ROOM', 'ROOM', 'ROOM']) house = addRoom(house, kind);
  for (const feature of ['DISHWASHER', 'LAUNDRY', 'WASHING_MACHINE', 'ELECTRONICS', 'CLEANING_GEAR']) house = withFeature(house, feature, true);
  const h = real.refresh({ home: house, instances: {} }, T0, random);
  const plan = realPlanner.plan(h, areas(house), null, T0);
  const blocks = plan.map(realPlanner.block);
  const runs = blocks.filter((block, i) => i === 0 || block !== blocks[i - 1]);
  assert.deepEqual(runs, [...new Set(blocks)], 'each block is one run: no area comes back later');
  assert.equal(blocks[0], 'start');
  assert.equal(blocks.at(-1), 'finish');
  assert.equal(blocks.find((b) => b.startsWith('room#')), roomArea(5), 'the first room added');
  for (const block of new Set(blocks)) {
    if (!block.startsWith('room#')) continue;
    const stages = plan.filter((key) => realPlanner.block(key) === block).map((key) => real.question(key).stage);
    const order = ['TIDY', 'DUST', 'WIPE', 'FLOOR_DRY', 'FLOOR_WET'];
    assert.deepEqual(stages, [...stages].sort((a, b) => order.indexOf(a) - order.indexOf(b)), `stages in ${block}`);
  }
  const hour = realPlanner.plan(h, areas(house), minutes(60), T0);
  const used = realPlanner.minutes(h, hour);
  assert.ok(used >= 50 && used <= 60, `an hour plans ${used} min`);
});
