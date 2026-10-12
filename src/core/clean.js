// Plan of a big clean (specification 4.4): which questions, under a time
// budget, and in which order. The loop then runs the plan like a series.

import { PRIORITY_WEIGHT, STAGES, groupOrder } from './catalog.js';
import { findRoom, parseArea } from './home.js';
import { keyArea } from './scheduler.js';
import { HOUR_MS, MINUTE_MS } from './time.js';

/** Cleaned this recently (a real YES or DONE): left out of a big clean. */
export const RECENT_MS = 24 * HOUR_MS;

/**
 * From the middle of the home to the door (4.4): living rooms first (dishes land in the kitchen on the way),
 * then kitchen, bathrooms, stairs, hallway, entryway, the rest. Groups come after all rooms.
 */
export const KIND_ORDER = [
  'ROOM',
  'BEDROOM',
  'KIDS_ROOM',
  'LIVING_ROOM',
  'DINING_ROOM',
  'STUDY',
  'WALK_IN_CLOSET',
  'KITCHEN',
  'PANTRY',
  'BATHROOM',
  'TOILET',
  'LAUNDRY_ROOM',
  'STAIRS',
  'HALLWAY',
  'ENTRYWAY',
  'STORAGE',
  'BASEMENT',
  'ATTIC',
  'BALCONY',
  'TERRACE',
  'GARAGE',
  'GARDEN',
];

/**
 * A part of a big clean that ends with a reward: 'start' (background work), an area ('room#2', 'group#LAUNDRY')
 * or 'finish' (taking things out at the end).
 * @typedef {string} Block
 */

/**
 * A big clean in progress, carried by its series.
 * @typedef {object} CleanProgress
 * @property {string[]} remaining questions after the one being asked, in order
 * @property {number} total questions in the plan at the start
 * @property {number} blockTasks tasks done in the current block, for its reward
 * @property {number} blockTimeMs their real time
 */

/** @returns {CleanProgress} */
export function startProgress(plan) {
  return { remaining: plan.slice(1), total: plan.length, blockTasks: 0, blockTimeMs: 0 };
}

/** Questions already behind, the one being asked not counted ("N of M" shows passed + 1). */
export function passed(progress) {
  return progress.total - progress.remaining.length - 1;
}

/** The question asked now and the ones right after it in the same area: what waits there (4.5). */
export function stop(progress, key) {
  const area = keyArea(key);
  const rest = [];
  for (const next of progress.remaining) {
    if (keyArea(next) !== area) break;
    rest.push(next);
  }
  return [key, ...rest];
}

/** @param {ReturnType<typeof import('./scheduler.js').createScheduler>} scheduler */
export function createPlanner(scheduler) {
  /** @returns {Block} */
  function block(key) {
    const stage = scheduler.question(key).stage;
    if (stage === 'START') return 'start';
    if (stage === 'FINISH') return 'finish';
    return keyArea(key);
  }

  /**
   * Active questions in the chosen areas that were not really cleaned (YES or DONE) in the last day. Not only
   * the due ones: a big clean is about doing more than usual.
   */
  function candidates(household, chosenAreas, now) {
    const chosen = new Set(chosenAreas);
    return scheduler.keysFor(household.home).filter((key) => {
      const state = household.instances[key];
      return (
        chosen.has(keyArea(key)) &&
        state !== undefined &&
        scheduler.isActive(household, key, now) &&
        (state.cleanedAt === null || now - state.cleanedAt >= RECENT_MS)
      );
    });
  }

  /** The areas offered at the start: those with something to do (4.4). */
  function areasWithWork(household, allAreas, now) {
    const withWork = new Set(candidates(household, allAreas, now).map(keyArea));
    return allAreas.filter((area) => withWork.has(area));
  }

  /** Like the draw's weight, but every question counts, also the ones not due yet. */
  function urgency(household, key, now) {
    const overdue = Math.min(scheduler.overdue(household.instances[key], now), scheduler.tuning.overdueCap);
    return overdue * PRIORITY_WEIGHT[scheduler.question(key).priority];
  }

  /** Estimated minutes of these questions if every one of them needs doing: the upper bound shown. */
  function minutes(household, keys) {
    return keys.reduce((sum, key) => sum + scheduler.minutes(household, key), 0);
  }

  function areaRank(household, area) {
    const parsed = parseArea(area);
    if ('room' in parsed) return KIND_ORDER.indexOf(findRoom(household.home, parsed.room).kind);
    return KIND_ORDER.length + groupOrder(parsed.group);
  }

  const BLOCK_RANK = { start: 0, finish: 2 };

  /** Start block, areas from the middle of the home to the door, finish block; in an area by stage. */
  function order(household, keys) {
    const rank = (key) => {
      const area = keyArea(key);
      const parsed = parseArea(area);
      return [
        BLOCK_RANK[block(key)] ?? 1,
        areaRank(household, area),
        'room' in parsed ? parsed.room : 0,
        STAGES.indexOf(scheduler.question(key).stage),
      ];
    };
    const ranks = new Map(keys.map((key, index) => [key, [...rank(key), index]]));
    return [...keys].sort((a, b) => {
      const ra = ranks.get(a);
      const rb = ranks.get(b);
      for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i];
      return 0;
    });
  }

  /**
   * The plan, in cleaning order. With a budget, the most urgent questions (priority and how overdue) whose
   * estimated times add up to at most the budget; a question that does not fit is left out and smaller ones
   * after it may still come in. Without a budget, all candidates.
   * @param {number | null} budgetMs
   */
  function plan(household, chosenAreas, budgetMs, now) {
    let chosen = candidates(household, chosenAreas, now);
    if (budgetMs !== null) {
      const limit = budgetMs / MINUTE_MS;
      let used = 0;
      const urgencies = new Map(chosen.map((key) => [key, urgency(household, key, now)]));
      chosen = [...chosen]
        .sort((a, b) => urgencies.get(b) - urgencies.get(a))
        .filter((key) => {
          const needed = scheduler.minutes(household, key);
          if (used + needed > limit) return false;
          used += needed;
          return true;
        });
    }
    return order(household, chosen);
  }

  return { block, candidates, areasWithWork, minutes, plan };
}
