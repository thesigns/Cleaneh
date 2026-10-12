import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDLE, createLoop, movesTo } from '../../../src/core/loop.js';
import { seededRandom } from '../../../src/core/random.js';
import { A, B, C, HOME, KITCHEN, ROOM1, T0, household, minutes, smallScheduler, state } from './support.js';

const scheduler = smallScheduler();
const loop = createLoop(scheduler);
const random = seededRandom(42);

/** A and B just due, C resting. */
const twoDue = household(HOME, [A, state(2, 2)], [B, state(4, 4)], [C, state(7, 1)]);
const nothingDue = household(HOME, [C, state(7, 1)]);

const reduce = (h, activity, event, at = T0) => loop.reduce(h, activity, event, at, random);
const then = (s, event, at = T0) => reduce(s.household, s.activity, event, at);
const request = (h = twoDue) => reduce(h, IDLE, { kind: 'request-task' });
const asked = (s) => {
  assert.equal(s.activity.kind, 'asking');
  return s.activity.key;
};
const answer = (s, given, at = T0) => then(s, { kind: 'answer', key: asked(s), answer: given }, at);
const startTask = (s) => {
  const key = asked(s);
  return then(then(s, { kind: 'answer', key, answer: 'NO' }), { kind: 'start', key });
};
const other = (key) => (key === A ? B : A);

test('give me a task starts a series with a due question', () => {
  const s = request();
  assert.ok([A, B].includes(asked(s)));
  assert.equal(s.activity.series.answered, 0);
});

test('give me a task reports when nothing is due', () => {
  const s = request(nothingDue);
  assert.equal(s.activity, IDLE);
  assert.equal(s.nothingDue, true);
  assert.equal(s.ended, null);
});

test('YES asks the next question until the pool is empty', () => {
  const first = request();
  const second = answer(first, 'YES');
  assert.notEqual(asked(second), asked(first));
  const end = answer(second, 'YES');
  assert.equal(end.activity, IDLE);
  assert.deepEqual(end.ended, {
    startedAt: T0,
    answered: 2,
    tasksDone: 0,
    taskTimeMs: 0,
    poolEmpty: true,
    clean: false,
    cleanFinished: false,
    abandoned: false,
  });
});

test('NO offers the task, the stopwatch runs, DONE cleans and the series goes on', () => {
  const first = request();
  const key = asked(first);
  const offering = answer(first, 'NO');
  assert.equal(offering.activity.kind, 'offering');

  const timing = then(offering, { kind: 'start', key });
  assert.equal(timing.activity.kind, 'timing');
  assert.equal(timing.activity.endsAt, T0 + minutes(scheduler.question(key).minutes));
  assert.deepEqual(timing.log, [{ key, kind: 'START', at: T0 }]);

  const done = then(timing, { kind: 'done', key }, T0 + minutes(2));
  const st = done.household.instances[key];
  assert.equal(st.lastCleanAt, T0 + minutes(2));
  assert.ok(Math.abs(st.interval - scheduler.question(key).days * 0.75) < 1e-9);
  assert.equal(done.activity.kind, 'asking');
  assert.equal(done.activity.series.tasksDone, 1);
  assert.equal(done.activity.series.taskTimeMs, minutes(2));
  assert.deepEqual(done.log, [{ key, kind: 'DONE', at: T0 + minutes(2), taskTimeMs: minutes(2) }]);
});

test('past the estimate the task keeps running and DONE records the real time', () => {
  const timing = startTask(request());
  const { key, endsAt } = timing.activity;
  const over = endsAt + minutes(40);
  assert.equal(then(timing, { kind: 'open' }, over).activity, timing.activity, 'opening the app does not interrupt');
  const done = then(timing, { kind: 'done', key }, over);
  assert.equal(done.log[0].taskTimeMs, over - T0);
});

test('giving up ends the series and keeps the question in the pool', () => {
  const timing = startTask(request());
  const { key } = timing.activity;
  const gaveUp = then(timing, { kind: 'give-up', key });
  assert.equal(gaveUp.activity, IDLE);
  assert.equal(gaveUp.ended.abandoned, false);
  assert.ok(scheduler.pool(gaveUp.household, T0).includes(key));
  assert.notEqual(gaveUp.household.instances[key].dirtySeenAfterDays, null);
});

test('DONE teaches the task time, giving up does not', () => {
  const timing = startTask(request());
  const { key } = timing.activity;
  const catalog = scheduler.question(key).minutes;
  const done = then(timing, { kind: 'done', key }, T0 + minutes(catalog * 1.5));
  assert.ok(Math.abs(done.household.instances[key].taskMinutes - (catalog * 0.7 + catalog * 1.5 * 0.3)) < 1e-6);

  const again = startTask(request());
  const gaveUp = then(again, { kind: 'give-up', key: again.activity.key });
  assert.equal(gaveUp.household.instances[again.activity.key].taskMinutes, null);
});

test('put-off questions are not asked again in the same series', () => {
  const first = request();
  const skipped = then(answer(first, 'NO'), { kind: 'skip', key: asked(first) });
  const second = asked(skipped);
  assert.notEqual(second, asked(first));
  assert.deepEqual(skipped.log, [{ key: asked(first), kind: 'NOT_NOW', at: T0 }]);
  const end = answer(skipped, 'NOT_NOW');
  assert.equal(end.activity, IDLE);
  assert.equal(end.ended.poolEmpty, false);
});

test('X ends the series and leaves the question in the pool', () => {
  const first = request();
  const end = then(first, { kind: 'stop' });
  assert.equal(end.activity, IDLE);
  assert.notEqual(end.ended, null);
  assert.deepEqual(end.log, [{ key: asked(first), kind: 'STOP', at: T0 }]);
  assert.ok(scheduler.pool(end.household, T0).includes(asked(first)));
});

test('X on the offer ends the series too', () => {
  const offering = answer(request(), 'NO');
  assert.equal(then(offering, { kind: 'stop' }).activity, IDLE);
});

test('an answer to a question no longer asked is ignored (another tab got there first)', () => {
  const first = request();
  const s = then(first, { kind: 'answer', key: other(asked(first)), answer: 'YES' });
  assert.equal(s.activity, first.activity);
  assert.equal(s.household, first.household);
  assert.equal(then(first, { kind: 'done', key: asked(first) }).activity, first.activity, 'no DONE without a stopwatch');
});

test('opening the app after a short break changes nothing', () => {
  const first = request();
  assert.equal(then(first, { kind: 'open' }, T0 + minutes(14)).activity, first.activity);
  const offering = answer(first, 'NO');
  assert.equal(then(offering, { kind: 'open' }, T0 + minutes(14)).activity, offering.activity);
  assert.equal(reduce(twoDue, IDLE, { kind: 'open' }).activity, IDLE);
});

test('opening the app 15 minutes after the last answer closes the series like X', () => {
  const first = request();
  const later = then(first, { kind: 'open' }, T0 + minutes(15));
  assert.equal(later.activity, IDLE, 'the home screen, no new question');
  assert.deepEqual(later.log, [{ key: asked(first), kind: 'STOP', at: T0 + minutes(15) }]);
  assert.equal(later.ended.abandoned, true);
  assert.ok(scheduler.pool(later.household, T0).includes(asked(first)), 'no penalty');
});

test('the break is counted from the last answer, not the start of the series', () => {
  const second = answer(request(), 'YES', T0 + minutes(10));
  assert.equal(then(second, { kind: 'open' }, T0 + minutes(20)).activity, second.activity);
});

test('a task 2 hours past its estimate is closed like giving up, without learning', () => {
  const timing = startTask(request());
  const { key, endsAt } = timing.activity;
  assert.equal(then(timing, { kind: 'open' }, endsAt + minutes(119)).activity, timing.activity);
  const later = then(timing, { kind: 'open' }, endsAt + minutes(120));
  assert.equal(later.activity, IDLE);
  assert.equal(later.log[0].kind, 'GIVE_UP');
  assert.equal(later.ended.abandoned, true);
  assert.equal(later.household.instances[key].taskMinutes, null);
  assert.ok(scheduler.pool(later.household, T0).includes(key));
});

test('take starts the stopwatch for a chosen task and puts off a pending question', () => {
  const asking = request();
  const chosen = other(asked(asking));
  const taken = then(asking, { kind: 'take', key: chosen });
  assert.equal(taken.activity.kind, 'timing');
  assert.equal(taken.activity.key, chosen);
  assert.deepEqual(taken.log.map((e) => e.kind), ['STOP', 'START']);
  assert.equal(then(taken, { kind: 'take', key: asked(asking) }).activity, taken.activity, 'only one task at a time');
  assert.equal(then(taken, { kind: 'request-task' }).activity, taken.activity);
});

test('take from the home screen, then DONE continues with a series', () => {
  const taken = reduce(twoDue, IDLE, { kind: 'take', key: A });
  assert.deepEqual(taken.log.map((e) => e.kind), ['START']);
  const done = then(taken, { kind: 'done', key: A }, T0 + minutes(4));
  assert.equal(done.activity.kind, 'asking');
  assert.equal(asked(done), B);
});

test('a series walks over to another room only between questions, a big clean also before the first', () => {
  const series = request().activity.series;
  assert.equal(movesTo(series, KITCHEN), false, 'no card before the first question of a series');
  assert.equal(movesTo({ ...series, lastArea: KITCHEN }, KITCHEN), false);
  assert.equal(movesTo({ ...series, lastArea: KITCHEN }, ROOM1), true);
  const clean = { ...series, clean: { remaining: [], total: 1, blockTasks: 0, blockTimeMs: 0 } };
  assert.equal(movesTo(clean, KITCHEN), true);
  assert.equal(movesTo({ ...clean, lastArea: KITCHEN }, KITCHEN), false);
  assert.equal(movesTo({ ...clean, lastArea: KITCHEN }, ROOM1), true);
});

test('the next question remembers the area of the last one', () => {
  const first = request();
  assert.equal(answer(first, 'YES').activity.series.lastArea, KITCHEN);
});

test('the activity survives a round trip through JSON', () => {
  const timing = startTask(request());
  assert.deepEqual(JSON.parse(JSON.stringify(timing.activity)), timing.activity);
  assert.deepEqual(JSON.parse(JSON.stringify(timing.household)), timing.household);
});
