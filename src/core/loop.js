// The main loop as a pure state machine (specification 4): a series of
// questions, a task with its stopwatch, a big clean, and closing what was
// left behind when the app is opened. Events that don't fit the current
// activity (another tab answered first, a double tap) change nothing.

import { createPlanner, startProgress } from './clean.js';
import { keyArea } from './scheduler.js';

/**
 * A run of questions, one after another, until X or an empty pool.
 * @typedef {object} Series
 * @property {number} startedAt
 * @property {number} lastInteractionAt
 * @property {string | null} lastArea area of the last question, for the same-area preference and the walk card
 * @property {string[]} skipped put off in this series (NOT NOW, NO without starting); not asked again in it
 * @property {number} answered
 * @property {number} tasksDone
 * @property {number} taskTimeMs real time of the tasks done
 * @property {import('./clean.js').CleanProgress | null} clean set when the series is a big clean
 */

/**
 * What the app is doing, stored as JSON with the `kind` discriminator.
 * @typedef {{ kind: 'idle' }
 *   | { kind: 'asking', key: string, series: Series }
 *   | { kind: 'offering', key: string, series: Series }
 *   | { kind: 'timing', key: string, series: Series, startedAt: number, endsAt: number }} Activity
 * `asking`: a question waiting for YES / NO / NOT NOW / N/A / X. `offering`: NO was answered, "Do it now".
 * `timing`: a task with its stopwatch counting up from `startedAt`; `endsAt` is the estimate, never shown,
 * used only to notice a forgotten DONE.
 */

/**
 * @typedef {{ kind: 'open' }
 *   | { kind: 'request-task' }
 *   | { kind: 'start-clean', plan: string[] }
 *   | { kind: 'answer', key: string, answer: import('./scheduler.js').Answer }
 *   | { kind: 'start', key: string }
 *   | { kind: 'skip', key: string }
 *   | { kind: 'stop' }
 *   | { kind: 'done', key: string }
 *   | { kind: 'give-up', key: string }
 *   | { kind: 'take', key: string }} LoopEvent
 * `open`: the app was opened or came back to the foreground. `skip`: NOT NOW on the "Do it now" offer.
 * `stop`: X. `take`: start the stopwatch for a chosen task right away (Sweep summary, 6.4).
 */

/** @typedef {'YES' | 'NO' | 'NOT_NOW' | 'NOT_APPLICABLE' | 'STOP' | 'START' | 'DONE' | 'GIVE_UP'} LogKind */

/**
 * One entry of the answer history (11). `taskTimeMs` is the real time spent, set on DONE.
 * @typedef {{ key: string, kind: LogKind, at: number, taskTimeMs?: number }} LogEntry
 */

/**
 * @typedef {object} SeriesSummary
 * @property {number} startedAt
 * @property {number} answered
 * @property {number} tasksDone
 * @property {number} taskTimeMs
 * @property {boolean} poolEmpty
 * @property {boolean} clean the series was a big clean
 * @property {boolean} cleanFinished its whole plan went through (not ended with X)
 * @property {boolean} abandoned closed when the app was opened after a long break (4.3), not by the user
 */

/**
 * @typedef {object} Step
 * @property {import('./scheduler.js').Household} household
 * @property {Activity} activity
 * @property {LogEntry[]} log entries for the answer history
 * @property {SeriesSummary | null} ended set when a series ended in this step
 * @property {boolean} nothingDue "Give me a task" or a big clean found nothing to do
 * @property {{ block: string, tasks: number, timeMs: number } | null} blockDone a big clean moved on to the
 *   next block: reward for the one that ended
 */

export const IDLE = Object.freeze({ kind: 'idle' });

/**
 * Whether a question about `area` comes after a change of room, so the app first shows the card for walking
 * over (4.5): in a series only between questions, in a big clean also before the first one.
 */
export function movesTo(series, area) {
  if (series.clean) return series.lastArea !== area;
  return series.lastArea !== null && series.lastArea !== area;
}

/** @param {ReturnType<typeof import('./scheduler.js').createScheduler>} scheduler */
export function createLoop(scheduler) {
  const t = scheduler.tuning;
  const planner = createPlanner(scheduler);

  /**
   * @param {import('./scheduler.js').Household} household
   * @param {Activity} activity
   * @param {LoopEvent} event
   * @param {number} now
   * @param {import('./random.js').Random} random
   * @returns {Step}
   */
  function reduce(household, activity, event, now, random) {
    const unchanged = step(household, activity);
    const current = (kind) => activity.kind === kind && activity.key === event.key;
    switch (event.kind) {
      case 'open':
        return open(household, activity, now);
      case 'request-task':
        return activity.kind === 'idle' ? startSeries(household, now, random) : unchanged;
      case 'start-clean':
        if (activity.kind !== 'idle') return unchanged;
        if (event.plan.length === 0) return step(household, activity, { nothingDue: true });
        return step(household, { kind: 'asking', key: event.plan[0], series: newSeries(now, { clean: startProgress(event.plan) }) });
      case 'answer':
        return current('asking') ? answered(household, activity, event.answer, now, random) : unchanged;
      case 'start':
        if (!current('offering')) return unchanged;
        return step(household, timing(household, event.key, touch(activity.series, now), now), { log: [entry(event.key, 'START', now)] });
      case 'skip':
        if (!current('offering')) return unchanged;
        return next(household, skip(touch(activity.series, now), event.key), now, random, [entry(event.key, 'NOT_NOW', now)], event.key);
      case 'stop':
        if (activity.kind !== 'asking' && activity.kind !== 'offering') return unchanged;
        return end(household, activity.series, now, [entry(activity.key, 'STOP', now)]);
      case 'done':
        // The real time, overtime included (4.2, 8.4).
        return current('timing') ? done(household, activity, now - activity.startedAt, now, random) : unchanged;
      case 'give-up':
        return current('timing') ? end(household, activity.series, now, [entry(activity.key, 'GIVE_UP', now)]) : unchanged;
      case 'take': {
        // Only one task at a time; a pending question is put off like X.
        if (activity.kind === 'timing') return unchanged;
        const putOff = activity.kind === 'idle' ? [] : [entry(activity.key, 'STOP', now)];
        const series = newSeries(now, { lastArea: keyArea(event.key) });
        return step(household, timing(household, event.key, series, now), { log: [...putOff, entry(event.key, 'START', now)] });
      }
      default:
        throw new Error(`Unknown event ${event.kind}`);
    }
  }

  /**
   * Opening the app closes what was left behind (4.3): a question or offer after 15 minutes (a big clean after
   * 2 hours) like X, a task 2 hours past its estimate like "Give up". After a shorter break nothing changes.
   */
  function open(household, activity, now) {
    switch (activity.kind) {
      case 'asking':
      case 'offering': {
        const window = activity.series.clean ? t.cleanBreakWindowMs : t.activeSeriesWindowMs;
        if (now < activity.series.lastInteractionAt + window) return step(household, activity);
        return end(household, activity.series, now, [entry(activity.key, 'STOP', now)], { abandoned: true });
      }
      case 'timing':
        // Overtime is normal (nobody watches the phone while cleaning); only a long-forgotten DONE is closed.
        if (now < activity.endsAt + t.forgottenTaskWindowMs) return step(household, activity);
        return end(household, activity.series, now, [entry(activity.key, 'GIVE_UP', now)], { abandoned: true });
      default:
        return step(household, activity);
    }
  }

  function startSeries(household, now, random) {
    const key = scheduler.pick(household, now, random);
    if (key === null) return step(household, IDLE, { nothingDue: true });
    return step(household, { kind: 'asking', key, series: newSeries(now) });
  }

  function timing(household, key, series, now) {
    return { kind: 'timing', key, series, startedAt: now, endsAt: now + scheduler.taskDurationMs(household, key) };
  }

  function answered(household, asking, answer, now, random) {
    const { key } = asking;
    const updated = scheduler.answer(household, key, answer, now);
    const series = { ...touch(asking.series, now), answered: asking.series.answered + 1, lastArea: keyArea(key) };
    const log = [entry(key, answer, now)];
    switch (answer) {
      case 'NO':
        return step(updated, { kind: 'offering', key, series }, { log });
      case 'NOT_NOW':
        return next(updated, skip(series, key), now, random, log, key);
      default:
        return next(updated, series, now, random, log, key);
    }
  }

  function done(household, activity, taskTimeMs, now, random) {
    const { key, series } = activity;
    const updated = scheduler.done(household, key, now, taskTimeMs);
    const clean = series.clean && { ...series.clean, blockTasks: series.clean.blockTasks + 1, blockTimeMs: series.clean.blockTimeMs + taskTimeMs };
    const after = {
      ...touch(series, now),
      lastArea: keyArea(key),
      tasksDone: series.tasksDone + 1,
      taskTimeMs: series.taskTimeMs + taskTimeMs,
      clean,
    };
    return next(updated, after, now, random, [{ key, kind: 'DONE', at: now, taskTimeMs }], key);
  }

  function next(household, series, now, random, log, from) {
    if (series.clean) return nextInPlan(household, series, now, log, from);
    const key = scheduler.pick(household, now, random, { exclude: series.skipped, preferArea: series.lastArea });
    if (key === null) return end(household, series, now, log);
    return step(household, { kind: 'asking', key, series }, { log });
  }

  /** The next question of a big clean; questions turned off on the way (N/A, a switch off) are passed over. */
  function nextInPlan(household, series, now, log, from) {
    const { clean } = series;
    const at = clean.remaining.findIndex((key) => scheduler.isActive(household, key, now));
    if (at < 0) return end(household, { ...series, clean: { ...clean, remaining: [] } }, now, log, { finished: true });
    const key = clean.remaining[at];
    const endedBlock = planner.block(from) !== planner.block(key) ? planner.block(from) : null;
    const progress = {
      remaining: clean.remaining.slice(at + 1),
      total: clean.total,
      blockTasks: endedBlock === null ? clean.blockTasks : 0,
      blockTimeMs: endedBlock === null ? clean.blockTimeMs : 0,
    };
    return step(household, { kind: 'asking', key, series: { ...series, clean: progress } }, {
      log,
      blockDone: endedBlock === null ? null : { block: endedBlock, tasks: clean.blockTasks, timeMs: clean.blockTimeMs },
    });
  }

  function end(household, series, now, log, { finished = false, abandoned = false } = {}) {
    const ended = {
      startedAt: series.startedAt,
      answered: series.answered,
      tasksDone: series.tasksDone,
      taskTimeMs: series.taskTimeMs,
      poolEmpty: scheduler.pool(household, now).length === 0,
      clean: series.clean !== null,
      cleanFinished: series.clean !== null && finished,
      abandoned,
    };
    return step(household, IDLE, { log, ended });
  }

  return { reduce, planner };
}

/** @returns {Step} */
function step(household, activity, { log = [], ended = null, nothingDue = false, blockDone = null } = {}) {
  return { household, activity, log, ended, nothingDue, blockDone };
}

/** @returns {Series} */
function newSeries(now, extra = {}) {
  return { startedAt: now, lastInteractionAt: now, lastArea: null, skipped: [], answered: 0, tasksDone: 0, taskTimeMs: 0, clean: null, ...extra };
}

function touch(series, now) {
  return { ...series, lastInteractionAt: now };
}

function skip(series, key) {
  return { ...series, skipped: [...series.skipped, key] };
}

function entry(key, kind, at) {
  return { key, kind, at };
}
