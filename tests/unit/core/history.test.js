import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daySummary, lastDoneAt, sinceLastCleaning } from '../../../src/core/history.js';
import { HOUR_MS, MINUTE_MS, fixedZone, ianaZone, startedMinutes } from '../../../src/core/time.js';
import { A, B, T0, days } from './support.js';

const hours = (value) => value * HOUR_MS;

test('the last cleaning is the latest DONE; YES does not count', () => {
  const log = [
    { key: A, kind: 'DONE', at: T0 - hours(5), taskTimeMs: 1 },
    { key: B, kind: 'YES', at: T0 - hours(1) },
    { key: B, kind: 'DONE', at: T0 - hours(3), taskTimeMs: 1 },
  ];
  assert.equal(lastDoneAt(log), T0 - hours(3));
  assert.equal(lastDoneAt([{ key: A, kind: 'YES', at: T0 }]), null);
});

test('before the first DONE there is nothing to say', () => {
  assert.deepEqual(sinceLastCleaning(null, T0), { kind: 'never' });
});

test('under an hour it was just now', () => {
  assert.deepEqual(sinceLastCleaning(T0, T0), { kind: 'just-now' });
  assert.deepEqual(sinceLastCleaning(T0 - 59 * MINUTE_MS, T0), { kind: 'just-now' });
  assert.deepEqual(sinceLastCleaning(T0 + MINUTE_MS, T0), { kind: 'just-now' }, 'a clock moved back');
});

test('under a day whole hours', () => {
  assert.deepEqual(sinceLastCleaning(T0 - hours(1), T0), { kind: 'hours', hours: 1 });
  assert.deepEqual(sinceLastCleaning(T0 - hours(5.9), T0), { kind: 'hours', hours: 5 });
  assert.deepEqual(sinceLastCleaning(T0 - hours(23.99), T0), { kind: 'hours', hours: 23 });
});

test('from a day up to 7 days days and hours, without minutes', () => {
  assert.deepEqual(sinceLastCleaning(T0 - hours(24), T0), { kind: 'days', days: 1, hours: 0 });
  assert.deepEqual(sinceLastCleaning(T0 - hours(47.5), T0), { kind: 'days', days: 1, hours: 23 });
  assert.deepEqual(sinceLastCleaning(T0 - days(3), T0), { kind: 'days', days: 3, hours: 0 });
  assert.deepEqual(sinceLastCleaning(T0 - days(7), T0), { kind: 'days', days: 7, hours: 0 });
});

test('after 7 days no number', () => {
  assert.deepEqual(sinceLastCleaning(T0 - days(7) - MINUTE_MS, T0), { kind: 'long' });
  assert.deepEqual(sinceLastCleaning(T0 - days(400), T0), { kind: 'long' });
});

test("today's summary counts DONE of the local day with their real time", () => {
  const zone = fixedZone(120);
  const now = Date.parse('2026-07-01T20:00:00Z'); // 22:00 local
  const log = [
    { key: A, kind: 'DONE', at: Date.parse('2026-06-30T21:30:00Z'), taskTimeMs: 4 * MINUTE_MS }, // 23:30 yesterday
    { key: A, kind: 'DONE', at: Date.parse('2026-06-30T22:30:00Z'), taskTimeMs: 5 * MINUTE_MS }, // 00:30 today
    { key: B, kind: 'YES', at: Date.parse('2026-07-01T10:00:00Z') },
    { key: B, kind: 'DONE', at: Date.parse('2026-07-01T19:00:00Z'), taskTimeMs: 8 * MINUTE_MS + 5000 },
  ];
  const summary = daySummary(log, now, zone);
  assert.deepEqual(summary, { tasks: 2, taskTimeMs: 13 * MINUTE_MS + 5000 });
  assert.equal(startedMinutes(summary.taskTimeMs), 14, 'every started minute counts');
  assert.deepEqual(daySummary([], now, zone), { tasks: 0, taskTimeMs: 0 });
});

test('local days follow daylight saving time', () => {
  const warsaw = ianaZone('Europe/Warsaw');
  assert.deepEqual(warsaw.date(Date.parse('2026-03-28T23:30:00Z')), { year: 2026, month: 3, day: 29 }); // winter, +1
  assert.deepEqual(warsaw.date(Date.parse('2026-07-01T22:30:00Z')), { year: 2026, month: 7, day: 2 }); // summer, +2
  assert.deepEqual(warsaw.date(Date.parse('2026-07-01T21:30:00Z')), { year: 2026, month: 7, day: 1 });
});
