import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { withFeature } from '../../../src/core/home.js';
import { createScheduler, instanceKey, parseKey } from '../../../src/core/scheduler.js';
import { seededRandom } from '../../../src/core/random.js';
import { ianaZone } from '../../../src/core/time.js';
import { A, B, C, D, E, HOME, KITCHEN, SMALL, T0, WITH_GARDEN, ZONE, days, household, smallScheduler, state } from './support.js';

const s = smallScheduler();
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, `${message ?? ''} ${actual} ≠ ${expected}`);
const stateOf = (h, key) => h.instances[key];

test('instance keys join the question and the area', () => {
  assert.equal(instanceKey('a', 'room#1'), 'a@room#1');
  assert.deepEqual(parseKey('a@group#PETS'), { questionId: 'a', area: 'group#PETS' });
});

describe('refresh: staggered start (8.1)', () => {
  test('creates relevant instances with a staggered start', () => {
    const h = s.refresh(household(HOME), T0, seededRandom(1));
    assert.deepEqual(Object.keys(h.instances).sort(), [A, B, C].sort());
    for (const [key, st] of Object.entries(h.instances)) {
      const base = s.question(key).days;
      assert.equal(st.interval, base);
      assert.ok(st.lastCleanAt <= T0 && st.lastCleanAt >= T0 - days(base), `${key} starts within one interval`);
      assert.equal(st.cleanedAt, null, 'a staggered start is not a real clean');
    }
  });

  test('leaves existing instances alone', () => {
    const once = s.refresh(household(HOME), T0, seededRandom(1));
    assert.equal(s.refresh(once, T0 + days(3), seededRandom(2)), once);
  });

  test('questions gated by a child switch need the parent too', () => {
    const catNoPet = withFeature(HOME, 'CAT', true);
    assert.ok(!(E in s.refresh(household(catNoPet), T0, seededRandom(1)).instances));
    const pet = withFeature(catNoPet, 'PET', true);
    assert.ok(E in s.refresh(household(pet), T0, seededRandom(1)).instances);
  });

  test('a seasonal question restarts with a staggered start when its season comes back', () => {
    const july = s.refresh(household(WITH_GARDEN), T0, seededRandom(1));
    assert.equal(july.instances[D].seasonStart, '2026-05-01');

    const december = Date.parse('2026-12-01T08:00:00Z');
    assert.equal(s.isRelevant(WITH_GARDEN, D, december), false);
    assert.equal(s.refresh(july, december, seededRandom(2)), july);

    const nextMay = Date.parse('2027-05-10T08:00:00Z');
    const may = s.refresh(july, nextMay, seededRandom(3)).instances[D];
    assert.equal(may.seasonStart, '2027-05-01');
    assert.ok(may.lastCleanAt >= nextMay - days(may.interval));
  });

  test('seasons follow the local date of the zone', () => {
    const warsaw = createScheduler({ zone: ianaZone('Europe/Warsaw'), catalog: SMALL });
    const lateApril = Date.parse('2026-04-30T22:30:00Z'); // 00:30 on 1 May in Warsaw
    assert.equal(warsaw.isRelevant(WITH_GARDEN, D, lateApril), true);
    assert.equal(s.isRelevant(WITH_GARDEN, D, lateApril), false, 'still April in UTC');
  });
});

describe('pool and weights (8.1, 8.2)', () => {
  test('the pool holds only active instances at least one interval overdue', () => {
    const h = household(HOME, [A, state(2, 3)], [B, state(4, 2)], [C, state(7, 8, { notApplicable: true })]);
    assert.deepEqual(s.pool(h, T0), [A]);
  });

  test('out of season questions leave the pool', () => {
    const h = household(WITH_GARDEN, [D, state(7, 30)]);
    assert.deepEqual(s.pool(h, T0), [D]);
    assert.deepEqual(s.pool(h, Date.parse('2026-11-15T08:00:00Z')), []);
  });

  test('weight is capped overdue squared times priority', () => {
    const h = household(HOME, [A, state(2, 20)], [B, state(4, 8)]);
    near(s.weight(h, A, T0), 16); // overdue 10, capped at 4
    near(s.weight(h, B, T0), 12); // overdue 2, squared, hygiene ×3
    near(s.weight(h, B, T0, KITCHEN), 24);
  });

  test('pick favours heavier questions', () => {
    const h = household(HOME, [A, state(2, 2)], [B, state(4, 4)]); // both overdue 1; B is hygiene
    const random = seededRandom(7);
    const picks = Array.from({ length: 4000 }, () => s.pick(h, T0, random));
    const shareB = picks.filter((key) => key === B).length / 4000;
    assert.ok(shareB >= 0.72 && shareB <= 0.78, `B share ${shareB}`);
  });

  test('pick respects exclusions and returns null when nothing is left', () => {
    const h = household(HOME, [A, state(2, 3)], [B, state(4, 5)]);
    assert.equal(s.pick(h, T0, seededRandom(1), { exclude: [A] }), B);
    assert.equal(s.pick(h, T0, seededRandom(1), { exclude: [A, B] }), null);
  });
});

describe('answers and adaptive intervals (8.3)', () => {
  test('YES lengthens the interval and rests the question', () => {
    const st = stateOf(s.answer(household(HOME, [A, state(2, 2)]), A, 'YES', T0), A);
    near(st.interval, 2.6);
    assert.equal(st.lastCleanAt, T0);
    assert.equal(st.cleanedAt, T0);
  });

  test('the interval never grows beyond four times the base', () => {
    let h = household(HOME, [A, state(2, 2)]);
    let now = T0;
    for (let i = 0; i < 20; i++) {
      h = s.answer(h, A, 'YES', now);
      now += days(stateOf(h, A).interval + 0.1);
    }
    near(stateOf(h, A).interval, 8);
  });

  test('NO then DONE shortens the interval once', () => {
    let h = household(HOME, [A, state(2, 2)]);
    h = s.answer(h, A, 'NO', T0);
    h = s.answer(h, A, 'NO', T0 + days(0.5));
    assert.equal(stateOf(h, A).lastCleanAt, state(2, 2).lastCleanAt, 'NO keeps the question overdue');
    const st = stateOf(s.done(h, A, T0 + days(1)), A);
    near(st.interval, 1.5);
    assert.equal(st.dirtySeenAfterDays, null);
    assert.equal(st.lastCleanAt, T0 + days(1));
  });

  test('the interval never drops below one day', () => {
    const st = stateOf(s.done(household(HOME, [A, state(1.2, 1.2, { pendingShrink: true })]), A, T0), A);
    near(st.interval, 1);
  });

  test('YES after an unresolved NO counts as cleaned outside the app', () => {
    const st = stateOf(s.answer(household(HOME, [A, state(2, 2, { pendingShrink: true })]), A, 'YES', T0), A);
    near(st.interval, 1.5);
    assert.equal(st.lastCleanAt, T0);
  });

  test('YES before the question was due keeps its interval', () => {
    const st = stateOf(s.answer(household(HOME, [A, state(2, 1)]), A, 'YES', T0), A);
    assert.equal(st.interval, 2);
    assert.equal(st.lastCleanAt, T0);
  });

  test('NOT NOW changes nothing and keeps overdue counting', () => {
    const h = household(HOME, [A, state(2, 3)]);
    assert.equal(s.answer(h, A, 'NOT_NOW', T0), h);
  });

  test('N/A removes the question for good', () => {
    const h = s.answer(household(HOME, [A, state(2, 3)]), A, 'NOT_APPLICABLE', T0);
    assert.deepEqual(s.pool(h, T0 + days(100)), []);
  });

  test('YES long after the due date jumps to the real time clean', () => {
    near(stateOf(s.answer(household(HOME, [A, state(2, 6)]), A, 'YES', T0), A).interval, 6);
  });

  test('NO long after the due date does not shrink', () => {
    let h = s.answer(household(HOME, [A, state(2, 6)]), A, 'NO', T0);
    h = s.done(h, A, T0 + days(0.1));
    near(stateOf(h, A).interval, 2);
  });

  test('NO soon after the due date shrinks below when it was seen', () => {
    let h = s.answer(household(HOME, [A, state(4, 4)]), A, 'NO', T0);
    h = s.done(h, A, T0 + days(0.5));
    near(stateOf(h, A).interval, 3);
  });

  test('the first NO decides, later ones do not move it', () => {
    let h = s.answer(household(HOME, [A, state(4, 4)]), A, 'NO', T0);
    h = s.answer(h, A, 'NO', T0 + days(3));
    near(stateOf(h, A).dirtySeenAfterDays, 4);
  });

  test('plain multipliers ignore how long ago the clean was', () => {
    const plain = smallScheduler({ elapsedAwareIntervals: false });
    let h = household(HOME, [A, state(2, 6)]);
    near(stateOf(plain.answer(h, A, 'YES', T0), A).interval, 2.6);
    h = plain.answer(h, A, 'NO', T0);
    near(stateOf(plain.done(h, A, T0), A).interval, 1.5);
  });
});

describe('task time calibration (8.4)', () => {
  // "a" is a 5-minute task in the small catalog (bounds 2.5–10 min).
  const withMinutes = (taskMinutes = null) => household(HOME, [A, state(2, 2, { pendingShrink: true, taskMinutes })]);
  const learned = (h, ms) => stateOf(s.done(h, A, T0, ms), A).taskMinutes;
  const MIN = 60_000;

  test('a real time moves the estimate part of the way', () => {
    near(learned(withMinutes(), 8 * MIN), 5 * 0.7 + 8 * 0.3);
    near(learned(withMinutes(4), 3 * MIN), 4 * 0.7 + 3 * 0.3);
  });

  test('outliers are ignored', () => {
    assert.equal(learned(withMinutes(), 20_000), null, 'tapped DONE right away');
    near(learned(withMinutes(4), 45 * MIN), 4, 'forgot to tap DONE');
  });

  test('DONE without a time teaches nothing', () => {
    assert.equal(learned(withMinutes(4), null), 4);
  });

  test('the estimate stays within bounds of the catalog time', () => {
    let h = withMinutes(9.5);
    for (let i = 0; i < 10; i++) h = s.done(h, A, T0, 20 * MIN);
    near(stateOf(h, A).taskMinutes, 10);
  });

  test('the stopwatch estimate follows the learned time', () => {
    assert.equal(s.taskDurationMs(withMinutes(), A), 5 * MIN);
    assert.equal(s.taskDurationMs(withMinutes(3.75), A), 225_000);
  });
});

describe('Sweep answers (6.5)', () => {
  test('first Sweep YES starts the base interval from today', () => {
    const st = stateOf(s.sweepAnswer(household(HOME), B, 'YES', T0, true), B);
    assert.equal(st.interval, 4);
    assert.equal(st.lastCleanAt, T0);
    assert.equal(st.cleanedAt, T0);
  });

  test('Sweep NO makes the question strongly overdue without shrinking', () => {
    const h = s.sweepAnswer(household(HOME), B, 'NO', T0, true);
    const st = stateOf(h, B);
    near(s.overdue(st, T0), 4);
    assert.equal(st.dirtySeenAfterDays, null);
    assert.equal(st.cleanedAt, null);
    assert.deepEqual(s.pool(h, T0), [B]);
  });

  test('on-demand Sweep keeps the learned interval', () => {
    assert.equal(stateOf(s.sweepAnswer(household(HOME, [A, state(5, 6)]), A, 'YES', T0, false), A).interval, 5);
  });

  test('a Sweep has no NOT NOW', () => {
    assert.throws(() => s.sweepAnswer(household(HOME), A, 'NOT_NOW', T0, false));
  });
});

describe('turned-off questions', () => {
  test('come back with a staggered start', () => {
    const off = s.answer(household(HOME, [A, state(2, 3)]), A, 'NOT_APPLICABLE', T0);
    assert.deepEqual(s.turnedOff(off, T0), [A]);
    const st = stateOf(s.restore(off, A, T0, seededRandom(1)), A);
    assert.equal(st.notApplicable, false);
    assert.ok(st.lastCleanAt >= T0 - days(2) && st.lastCleanAt <= T0);
    assert.deepEqual(s.turnedOff(s.restore(off, A, T0, seededRandom(1)), T0), []);
  });

  test('questions of a missing area are not listed', () => {
    const off = household(HOME, [D, state(7, 1, { notApplicable: true })]);
    assert.deepEqual(s.turnedOff(off, T0), [], 'no garden in this home');
  });
});

describe('developer mode (13.4)', () => {
  test('a chosen month decides the seasons', () => {
    let month = null;
    const dev = createScheduler({ zone: ZONE, catalog: SMALL, seasonMonth: () => month });
    assert.equal(dev.isRelevant(WITH_GARDEN, D, T0), true, 'July: the garden is in season');
    month = 12;
    assert.equal(dev.isRelevant(WITH_GARDEN, D, T0), false);
    assert.ok(!(D in dev.refresh(household(WITH_GARDEN), T0, seededRandom(1)).instances));
    month = 5;
    assert.equal(dev.refresh(household(WITH_GARDEN), T0, seededRandom(1)).instances[D].seasonStart, '2026-05-01');
  });

  test('aging moves clean dates back, so questions become due', () => {
    const fresh = household(HOME, [A, state(2, 0.5, { cleanedAt: T0 - days(0.5) })]);
    assert.deepEqual(s.pool(fresh, T0), []);
    const aged = s.aged(fresh, days(2));
    assert.deepEqual(s.pool(aged, T0), [A]);
    assert.equal(stateOf(aged, A).cleanedAt, T0 - days(2.5));
    assert.equal(stateOf(aged, A).interval, 2);
  });
});
