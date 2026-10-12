// The only place that changes state (specification 13.2): load from the store,
// call core, save the result. Calls run one at a time, also across tabs, and
// always start from what is stored, so a change made in another tab is never
// overwritten. After every change the other tabs get a signal to reload.

import { createPlanner } from '../core/clean.js';
import { daySummary, sinceLastCleaning } from '../core/history.js';
import { areas } from '../core/home.js';
import { IDLE, createLoop } from '../core/loop.js';
import { keyArea } from '../core/scheduler.js';
import {
  answerSweep as answerCard,
  dueByArea as countDue,
  firstSweep,
  isComplete,
  onDemandSweep,
  sweepHousehold,
  sweepSummary,
  undoSweep as undoCard,
} from '../core/sweep.js';
import { DAY_MS } from '../core/time.js';
import { createLock } from './lock.js';

const CHANNEL = 'cleaneh';

/** The real clock and randomness, used outside tests. */
export const systemClock = { now: () => Date.now() };
export const systemRandom = { next: () => Math.random() };

/**
 * @param {object} options
 * @param {Awaited<ReturnType<typeof import('../data/store.js').openStore>>} options.store
 * @param {ReturnType<typeof import('../core/scheduler.js').createScheduler>} options.scheduler
 * @param {import('../core/time.js').Zone} options.zone the same zone as the scheduler's
 * @param {import('../core/time.js').Clock} [options.clock]
 * @param {import('../core/random.js').Random} [options.random]
 * @param {{ run: Function }} [options.lock]
 * @param {string} [options.channelName] tabs with the same name hear each other's changes
 * @param {() => number | null} [options.lastDoneAt] developer mode (13.4): a pretend time of the last DONE; null = real
 */
export function createEngine({ store, scheduler, zone, clock = systemClock, random = systemRandom, lock = createLock('cleaneh-engine'), channelName = CHANNEL, lastDoneAt = () => null }) {
  const loop = createLoop(scheduler);
  const planner = createPlanner(scheduler);
  const listeners = new Set();
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(channelName) : null;

  const notify = (change) => {
    for (const listener of listeners) listener(change);
  };
  if (channel) channel.onmessage = (message) => notify({ ...message.data, fromOtherTab: true });
  store.onVersionChange(() => notify({ type: 'version-change' }));

  /** Runs `work(state, now)` in the queue on freshly loaded state. */
  function locked(work) {
    return lock.run(async () => work(await store.load(), clock.now()));
  }

  /** Saves a change and tells this tab and the others. */
  async function save(change, type = 'changed') {
    await store.commit(change);
    channel?.postMessage({ type });
    notify({ type, fromOtherTab: false });
  }

  /**
   * Runs one loop event (specification 4). `eventFor(household, now)` may build the event from the state it
   * runs on (a big clean plans from it). Returns core's step.
   */
  function send(eventOrBuilder) {
    return locked(async ({ household: loaded, activity }, now) => {
      const household = scheduler.refresh(loaded, now, random);
      const event = typeof eventOrBuilder === 'function' ? eventOrBuilder(household, now) : eventOrBuilder;
      const step = loop.reduce(household, activity, event, now, random);
      const unchanged = step.household === loaded && step.activity === activity && step.log.length === 0 && !step.ended;
      if (!unchanged) {
        await save({
          before: loaded,
          after: step.household,
          activity: step.activity,
          log: step.log,
          series: step.ended ? { ...step.ended, endedAt: now } : undefined,
        });
      }
      return step;
    });
  }

  /** What the screens show: the home, the activity, the Sweep in progress, settings, today and the last cleaning. */
  function snapshot() {
    return locked(async ({ household, activity, sweep, settings }, now) => {
      const [doneAt, recent, firstDone] = await Promise.all([lastDoneAt() ?? store.lastDoneAt(), store.doneSince(now - 2 * DAY_MS), store.firstSweepDone()]);
      return {
        household,
        activity,
        sweep,
        settings,
        firstSweepDone: firstDone,
        today: daySummary(recent, now, zone),
        sinceLastCleaning: sinceLastCleaning(doneAt, now),
      };
    });
  }

  /** What a big clean of each area would hold now (4.4): areas with something to do, in home order. */
  function cleanOptions() {
    return locked(({ household: loaded }, now) => {
      const household = scheduler.refresh(loaded, now, random);
      const all = areas(household.home);
      const byArea = new Map();
      for (const key of planner.candidates(household, all, now)) byArea.set(keyArea(key), [...(byArea.get(keyArea(key)) ?? []), key]);
      return all.filter((area) => byArea.has(area)).map((area) => ({ area, questions: byArea.get(area).length, minutes: planner.minutes(household, byArea.get(area)) }));
    });
  }

  /** The plan a big clean would follow: how many questions and their time if all need doing; null when empty. */
  function previewClean(chosenAreas, budgetMs) {
    return locked(({ household: loaded }, now) => {
      const household = scheduler.refresh(loaded, now, random);
      const plan = planner.plan(household, chosenAreas, budgetMs, now);
      return plan.length === 0 ? null : { questions: plan.length, minutes: planner.minutes(household, plan) };
    });
  }

  /** Plans and starts a big clean in one go, so the plan matches the state it starts from. */
  function startClean(chosenAreas, budgetMs) {
    return send((household, now) => ({ kind: 'start-clean', plan: planner.plan(household, chosenAreas, budgetMs, now) }));
  }

  /** Starts a Sweep, or returns the one in progress. Not while a series or task is going on: then null. */
  function startSweep(create) {
    return locked(async ({ household: loaded, activity, sweep }, now) => {
      if (sweep) return sweep;
      if (activity.kind !== 'idle') return null;
      const created = create(loaded, now);
      await save({ before: loaded, after: sweepHousehold(scheduler, created), sweep: created });
      return created;
    });
  }

  /** The onboarding Sweep (★ questions, 6.6). */
  const startFirstSweep = () => startSweep((household, now) => firstSweep(scheduler, household, now));

  /** An on-demand Sweep of the whole home, or of one area. */
  const startOnDemandSweep = (area = null) =>
    startSweep((household, now) => onDemandSweep(scheduler, scheduler.refresh(household, now, random), now, area));

  /** Applies a change to the Sweep in progress; its answers are saved right away (6.1). */
  function changeSweep(change) {
    return locked(async ({ household: loaded, sweep }, now) => {
      if (!sweep) throw new Error('No Sweep in progress');
      const changed = change(sweep, now);
      await save({ before: loaded, after: sweepHousehold(scheduler, changed), sweep: changed });
      return changed;
    });
  }

  const answerSweep = (answer) => changeSweep((sweep, now) => answerCard(sweep, answer, now));
  const undoSweep = () => changeSweep((sweep) => undoCard(sweep));

  /**
   * Ends the Sweep in progress, completed or not; the answers so far stay. After the first Sweep the other
   * questions get their staggered start (8.1). Returns what to start with (6.4).
   */
  function finishSweep() {
    return locked(async ({ household: loaded, sweep }, now) => {
      if (!sweep) throw new Error('No Sweep in progress');
      const answered = sweepHousehold(scheduler, sweep);
      const after = sweep.scope.kind === 'first' ? scheduler.refresh(answered, now, random) : answered;
      await save({
        before: loaded,
        after,
        sweep: null,
        sweepRecord: {
          scope: sweep.scope.kind,
          area: sweep.scope.kind === 'area' ? sweep.scope.area : null,
          startedAt: sweep.startedAt,
          endedAt: now,
          answered: sweep.steps.length,
          completed: isComplete(sweep),
        },
      });
      return sweepSummary(scheduler, sweep);
    });
  }

  /** Changes the home (rooms, switches) outside a Sweep. New questions get a staggered start. */
  function updateHome(change) {
    return locked(async ({ household: loaded }, now) => {
      const after = scheduler.refresh({ ...loaded, home: change(loaded.home) }, now, random);
      await save({ before: loaded, after });
      return after.home;
    });
  }

  /** Questions turned off with N/A (settings). */
  function turnedOff() {
    return locked(({ household }, now) => scheduler.turnedOff(household, now));
  }

  /** Brings back a question turned off with N/A. */
  function restore(key) {
    return locked(async ({ household: loaded }, now) => {
      await save({ before: loaded, after: scheduler.restore(loaded, key, now, random) });
    });
  }

  /** How many questions are due in each area, for choosing what a Sweep covers (6.6). */
  function dueByArea() {
    return locked(({ household }, now) => countDue(scheduler, scheduler.refresh(household, now, random), now));
  }

  function updateSettings(patch) {
    return locked(async ({ settings }) => {
      const next = { ...settings, ...patch };
      await save({ settings: next });
      return next;
    });
  }

  /** Developer mode (13.4): the questions age by `byMs`. Only while nothing is going on; false otherwise. */
  function age(byMs) {
    return locked(async ({ household: loaded, activity, sweep }) => {
      if (activity.kind !== 'idle' || sweep) return false;
      await save({ before: loaded, after: scheduler.aged(loaded, byMs) });
      return true;
    });
  }

  /** Developer mode: every active question with its numbers, the pool first, by weight. */
  function poolPreview() {
    return locked(({ household: loaded }, now) => {
      const household = scheduler.refresh(loaded, now, random);
      const pool = new Set(scheduler.pool(household, now));
      return scheduler
        .keysFor(household.home)
        .filter((key) => key in household.instances && scheduler.isActive(household, key, now))
        .map((key) => {
          const state = household.instances[key];
          return { key, interval: state.interval, overdue: scheduler.overdue(state, now), weight: scheduler.weight(household, key, now), minutes: scheduler.minutes(household, key), inPool: pool.has(key) };
        })
        .sort((a, b) => b.inPool - a.inPool || b.weight - a.weight || b.overdue - a.overdue);
    });
  }

  /** Deletes everything and starts over (5.2). */
  function reset() {
    return lock.run(async () => {
      await store.reset();
      channel?.postMessage({ type: 'changed' });
      notify({ type: 'changed', fromOtherTab: false });
    });
  }

  return {
    send,
    open: () => send({ kind: 'open' }),
    snapshot,
    cleanOptions,
    previewClean,
    startClean,
    startFirstSweep,
    startOnDemandSweep,
    answerSweep,
    undoSweep,
    finishSweep,
    updateHome,
    turnedOff,
    restore,
    dueByArea,
    updateSettings,
    age,
    poolPreview,
    reset,
    /**
     * Listens for changes: `{ type: 'changed' | 'version-change', fromOtherTab }`. A tab that hears a change
     * reloads its view with `snapshot()`. Returns a function that stops listening.
     */
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close() {
      channel?.close();
      listeners.clear();
    },
    /** True when the activity is idle and no Sweep is in progress: safe to switch to a new app version (9.2). */
    isIdle: async () => {
      const { activity, sweep } = await store.load();
      return activity.kind === IDLE.kind && sweep === null;
    },
  };
}
