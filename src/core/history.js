// What the home screen says about the past (specification 5.1, 11): today's
// result and the time since the last cleaning. The texts are made by the UI.

import { DAY_MS, HOUR_MS, isoDate } from './time.js';

/**
 * Time since the last cleaning, without minutes and without a number after a week (5.1).
 * @typedef {{ kind: 'never' }
 *   | { kind: 'just-now' }
 *   | { kind: 'hours', hours: number }
 *   | { kind: 'days', days: number, hours: number }
 *   | { kind: 'long' }} SinceLastCleaning
 */

/** The last cleaning: the latest DONE in the history (a YES says it is clean, not that anyone cleaned). */
export function lastDoneAt(log) {
  let latest = null;
  for (const entry of log) if (entry.kind === 'DONE' && (latest === null || entry.at > latest)) latest = entry.at;
  return latest;
}

/**
 * Under an hour "just now", under a day hours, from a day up to 7 days days and hours, longer without a
 * number, before the first DONE nothing.
 * @param {number | null} doneAt
 * @returns {SinceLastCleaning}
 */
export function sinceLastCleaning(doneAt, now) {
  if (doneAt === null) return { kind: 'never' };
  const elapsed = Math.max(0, now - doneAt);
  if (elapsed < HOUR_MS) return { kind: 'just-now' };
  if (elapsed < DAY_MS) return { kind: 'hours', hours: Math.floor(elapsed / HOUR_MS) };
  if (elapsed <= 7 * DAY_MS) return { kind: 'days', days: Math.floor(elapsed / DAY_MS), hours: Math.floor((elapsed % DAY_MS) / HOUR_MS) };
  return { kind: 'long' };
}

/** Tasks done today (local date) and their real time, for "Today: 2 tasks · 14 min". */
export function daySummary(log, now, zone) {
  const today = isoDate(zone.date(now));
  let tasks = 0;
  let taskTimeMs = 0;
  for (const entry of log) {
    if (entry.kind !== 'DONE' || isoDate(zone.date(entry.at)) !== today) continue;
    tasks += 1;
    taskTimeMs += entry.taskTimeMs ?? 0;
  }
  return { tasks, taskTimeMs };
}
