// The Sweep (specification 6): a quick pass over the home, card by card, with
// undo. A Sweep is plain data (stored as JSON while in progress); the household
// is always derived by replaying the answers on the household from the start,
// so undo is exact and an interrupted Sweep keeps what was answered.

import { PRIORITY_WEIGHT } from './catalog.js';
import { keyArea } from './scheduler.js';

/**
 * @typedef {{ kind: 'first' } | { kind: 'home' } | { kind: 'area', area: string }} SweepScope
 * `first`: onboarding, the ★ questions (6.6). `home` / `area`: on demand, what is due in the whole home or in one
 * area.
 */

/**
 * @typedef {object} Sweep
 * @property {SweepScope} scope
 * @property {number} startedAt
 * @property {import('./scheduler.js').Household} start the household before the first answer
 * @property {string[]} keys the questions, fixed when the Sweep starts, grouped by area in home order
 * @property {{ key: string, answer: 'YES' | 'NO' | 'NOT_APPLICABLE', at: number }[]} steps answers so far
 */

/**
 * A card to show. `position` and `areaTotal` drive the "Kitchen 3/6" progress; the first card of an area
 * (`position` 1) comes after the walk card with `areaTotal` questions (4.5).
 * @typedef {{ key: string, position: number, areaTotal: number }} SweepCard
 */

/** The first Sweep: the ★ questions of the rooms and groups chosen in the setup (6.6). */
export function firstSweep(scheduler, household, now) {
  const keys = scheduler.keysFor(household.home).filter((key) => scheduler.question(key).firstSweep && scheduler.isRelevant(household.home, key, now));
  return { scope: { kind: 'first' }, startedAt: now, start: household, keys, steps: [] };
}

/** An on-demand Sweep over what is due now, in the whole home or one area; skips N/A, out-of-season and resting questions. */
export function onDemandSweep(scheduler, household, now, area = null) {
  const keys = scheduler.pool(household, now).filter((key) => area === null || keyArea(key) === area);
  return { scope: area === null ? { kind: 'home' } : { kind: 'area', area }, startedAt: now, start: household, keys, steps: [] };
}

/** How many questions are due in each area, for choosing the scope of a Sweep (6.6). */
export function dueByArea(scheduler, household, now) {
  const counts = {};
  for (const key of scheduler.pool(household, now)) {
    const area = keyArea(key);
    counts[area] = (counts[area] ?? 0) + 1;
  }
  return counts;
}

const households = new WeakMap();

/** The household with every answer so far applied. */
export function sweepHousehold(scheduler, sweep) {
  let household = households.get(sweep);
  if (!household) {
    const first = sweep.scope.kind === 'first';
    household = sweep.steps.reduce((h, step) => scheduler.sweepAnswer(h, step.key, step.answer, step.at, first), sweep.start);
    households.set(sweep, household);
  }
  return household;
}

/** @returns {SweepCard[]} */
export function sweepCards(sweep) {
  const perArea = {};
  for (const key of sweep.keys) perArea[keyArea(key)] = (perArea[keyArea(key)] ?? 0) + 1;
  const seen = {};
  return sweep.keys.map((key) => {
    const area = keyArea(key);
    seen[area] = (seen[area] ?? 0) + 1;
    return { key, position: seen[area], areaTotal: perArea[area] };
  });
}

/** The card to show now, or null when the Sweep is complete. */
export function currentCard(sweep) {
  return sweepCards(sweep)[sweep.steps.length] ?? null;
}

export function isComplete(sweep) {
  return sweep.steps.length >= sweep.keys.length;
}

/** @returns {Sweep} */
export function answerSweep(sweep, answer, now) {
  if (isComplete(sweep)) throw new Error('The Sweep is complete');
  if (!['YES', 'NO', 'NOT_APPLICABLE'].includes(answer)) throw new Error(`A Sweep has no ${answer}`);
  return { ...sweep, steps: [...sweep.steps, { key: sweep.keys[sweep.steps.length], answer, at: now }] };
}

/** @returns {Sweep} */
export function undoSweep(sweep) {
  if (sweep.steps.length === 0) return sweep;
  return { ...sweep, steps: sweep.steps.slice(0, -1) };
}

/**
 * Up to `limit` things to start with: NO answers by priority, then shortest first (6.4); the rest waits in the
 * queue.
 */
export function sweepSummary(scheduler, sweep, limit = 3) {
  const household = sweepHousehold(scheduler, sweep);
  const dirty = [...new Set(sweep.steps.filter((step) => step.answer === 'NO').map((step) => step.key))];
  const rank = (key) => [-PRIORITY_WEIGHT[scheduler.question(key).priority], scheduler.minutes(household, key)];
  dirty.sort((a, b) => {
    const [pa, ma] = rank(a);
    const [pb, mb] = rank(b);
    return pa - pb || ma - mb;
  });
  return { toStart: dirty.slice(0, limit), remaining: Math.max(0, dirty.length - limit) };
}
