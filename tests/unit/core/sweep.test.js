import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addRoom, areas, emptyHome, groupArea, roomArea, withFeature } from '../../../src/core/home.js';
import { createScheduler, keyArea } from '../../../src/core/scheduler.js';
import {
  answerSweep,
  currentCard,
  dueByArea,
  firstSweep,
  isComplete,
  onDemandSweep,
  sweepCards,
  sweepHousehold,
  sweepSummary,
  undoSweep,
} from '../../../src/core/sweep.js';
import { A, B, C, HOME, KITCHEN, ROOM1, T0, ZONE, household, smallScheduler, state } from './support.js';

const scheduler = createScheduler({ zone: ZONE });

/** A typical flat: entryway, kitchen, bathroom, two rooms, a balcony; washing machine and computer. */
let flat = emptyHome();
for (const kind of ['ENTRYWAY', 'KITCHEN', 'BATHROOM', 'ROOM', 'ROOM', 'BALCONY']) flat = addRoom(flat, kind);
for (const feature of ['LAUNDRY', 'WASHING_MACHINE', 'ELECTRONICS', 'COMPUTER']) flat = withFeature(flat, feature, true);

const first = (home = flat) => firstSweep(scheduler, household(home), T0);

function answerAll(sweep, answer) {
  let s = sweep;
  while (!isComplete(s)) s = answerSweep(s, answer, T0);
  return s;
}

test('the first Sweep asks only starred questions of the chosen rooms and groups', () => {
  const cards = sweepCards(first());
  assert.ok(cards.every((card) => scheduler.question(card.key).firstSweep));
  const order = [...new Set(cards.map((card) => keyArea(card.key)))];
  assert.deepEqual(order, areas(flat).filter((area) => order.includes(area)), 'grouped by area, in home order');
  assert.ok(cards.every((card) => keyArea(card.key) !== groupArea('PETS')), 'no pet questions without pets');
});

test("a teenager's single room gives a short first Sweep", () => {
  const cards = sweepCards(first(addRoom(emptyHome(), 'ROOM')));
  assert.ok(cards.length > 0);
  assert.ok(cards.every((card) => keyArea(card.key) === roomArea(1)));
});

test('progress counts within each area', () => {
  const cards = sweepCards(first());
  const room2 = cards.filter((card) => keyArea(card.key) === roomArea(5));
  assert.equal(room2.length, cards.filter((card) => keyArea(card.key) === roomArea(4)).length);
  assert.deepEqual(room2.map((card) => card.position), room2.map((_, i) => i + 1));
  assert.ok(room2.every((card) => card.areaTotal === room2.length));
});

test('a typical flat first Sweep stays short', () => {
  const total = first().keys.length;
  assert.ok(total <= 60, `first Sweep has ${total} cards`);
});

test('answers apply as they come and undo reverts exactly', () => {
  const sweep = first();
  const answered = answerSweep(sweep, 'NO', T0);
  assert.ok(currentCard(sweep).key in sweepHousehold(scheduler, answered).instances);
  assert.deepEqual(sweepHousehold(scheduler, undoSweep(answered)), sweepHousehold(scheduler, sweep));
  assert.deepEqual(currentCard(undoSweep(answered)), currentCard(sweep));
  assert.equal(undoSweep(sweep), sweep, 'nothing to undo');
});

test('a Sweep has no NOT NOW and ends after the last card', () => {
  assert.throws(() => answerSweep(first(), 'NOT_NOW', T0));
  const done = answerAll(first(), 'YES');
  assert.equal(currentCard(done), null);
  assert.throws(() => answerSweep(done, 'YES', T0));
});

test('the summary shows at most the limit, hygiene first, then shortest', () => {
  const s = smallScheduler();
  const h = household(HOME, [A, state(2, 3)], [B, state(4, 5)], [C, state(7, 8)]);
  const sweep = answerAll(onDemandSweep(s, h, T0), 'NO');
  assert.deepEqual(sweepSummary(s, sweep, 2), { toStart: [B, A], remaining: 1 });
});

test('an on-demand Sweep of one area covers only what is due there', () => {
  const s = smallScheduler();
  const h = household(HOME, [A, state(2, 3)], [B, state(4, 1)], [C, state(7, 8)]);
  const sweep = onDemandSweep(s, h, T0, KITCHEN);
  assert.deepEqual(sweep.scope, { kind: 'area', area: KITCHEN });
  assert.deepEqual(currentCard(sweep), { key: A, position: 1, areaTotal: 1 });
  assert.ok(isComplete(answerSweep(sweep, 'YES', T0)));
  assert.deepEqual(dueByArea(s, h, T0), { [KITCHEN]: 1, [ROOM1]: 1 });
});

test('an interrupted first Sweep keeps what was answered', () => {
  const partial = answerSweep(answerSweep(first(), 'YES', T0), 'NO', T0);
  assert.equal(Object.keys(sweepHousehold(scheduler, partial).instances).length, 2);
});

test('a Sweep stored as JSON continues where it stopped', () => {
  const partial = answerSweep(first(), 'NO', T0);
  const restored = JSON.parse(JSON.stringify(partial));
  assert.deepEqual(sweepHousehold(scheduler, restored), sweepHousehold(scheduler, partial));
  assert.deepEqual(currentCard(restored), currentCard(partial));
  assert.deepEqual(sweepHousehold(scheduler, undoSweep(restored)), sweepHousehold(scheduler, undoSweep(partial)));
});

test('more rooms give more cards', () => {
  const one = first(addRoom(emptyHome(), 'ROOM'));
  const three = first(addRoom(addRoom(addRoom(emptyHome(), 'ROOM'), 'ROOM'), 'ROOM'));
  assert.equal(three.keys.length, 3 * one.keys.length);
});
