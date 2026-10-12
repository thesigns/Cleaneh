// Schedule and choice of questions (specification 8): the pool, weights, the
// weighted draw, adaptive intervals, seasons, the staggered start and task
// time calibration. Pure functions over plain data.

import { DEFAULT_CATALOG, PRIORITY_WEIGHT, inSeason, kindSets, seasonWindowStart } from './catalog.js';
import { areas, findRoom, hasArea, isEnabled, parseArea } from './home.js';
import { DAY_MS, MINUTE_MS, daysBetween } from './time.js';

/**
 * One question in one area: 'questionId@area', e.g. 'room_floor_vacuumed@room#2'.
 * @typedef {string} InstanceKey
 */

/**
 * @typedef {object} InstanceState
 * @property {number} interval days before the question may come back
 * @property {number} lastCleanAt last YES or DONE, or the synthetic date of a staggered start or a Sweep NO;
 *   overdue is measured from here
 * @property {number | null} dirtySeenAfterDays days after the last clean at which NO was first seen; the next
 *   clean shortens the interval once
 * @property {boolean} notApplicable answered N/A
 * @property {string | null} seasonStart for seasonal questions: start ('YYYY-MM-DD') of the season window this
 *   instance was (re)started in
 * @property {number | null} taskMinutes task time learned from real DONE times; null = the catalog's
 * @property {number | null} cleanedAt last real YES or DONE (also YES in a Sweep); never synthetic
 */

/**
 * @typedef {object} Household
 * @property {import('./home.js').Home} home
 * @property {Record<InstanceKey, InstanceState>} instances
 */

/** @typedef {'YES' | 'NO' | 'NOT_NOW' | 'NOT_APPLICABLE'} Answer */

/** Starting values from the specification (section 8, 4.3), all meant to be tuned. */
export const DEFAULT_TUNING = Object.freeze({
  yesFactor: 1.3,
  noFactor: 0.75,
  minIntervalDays: 1,
  maxIntervalFactor: 4,
  overdueCap: 4,
  sameAreaBoost: 2,
  /**
   * Use the real time since the last clean when adapting intervals (8.3): YES after E days means the place stays
   * clean at least E days; NO after E days only shortens the interval when E was short. Off = plain multipliers,
   * kept for comparison in the simulation.
   */
  elapsedAwareIntervals: true,
  /** Task time learning (8.4): weight of a new measurement, outlier factor, bounds around the catalog time. */
  taskTimeWeight: 0.3,
  taskTimeOutlier: 3,
  taskTimeMinFactor: 0.5,
  taskTimeMaxFactor: 2,
  taskTimeMinMinutes: 1,
  taskTimeMaxMinutes: 30,
  /** A series with no interaction for this long is closed when the app is opened (4.3). */
  activeSeriesWindowMs: 15 * MINUTE_MS,
  /** A task this long over its estimate counts as given up when the app is opened (forgotten DONE). */
  forgottenTaskWindowMs: 120 * MINUTE_MS,
  /** The same for a break in a big clean (4.4). */
  cleanBreakWindowMs: 120 * MINUTE_MS,
});

/** @returns {InstanceKey} */
export function instanceKey(questionId, area) {
  return `${questionId}@${area}`;
}

/** @returns {{ questionId: string, area: string }} */
export function parseKey(key) {
  const at = key.indexOf('@');
  return { questionId: key.slice(0, at), area: key.slice(at + 1) };
}

export function keyArea(key) {
  return key.slice(key.indexOf('@') + 1);
}

/**
 * @param {object} options
 * @param {import('./time.js').Zone} options.zone
 * @param {ReturnType<typeof import('./catalog.js').createCatalog>} [options.catalog]
 * @param {Partial<typeof DEFAULT_TUNING>} [options.tuning]
 * @param {() => number | null} [options.seasonMonth] developer mode (13.4): seasons follow this month; null = real
 */
export function createScheduler({ zone, catalog = DEFAULT_CATALOG, tuning = {}, seasonMonth = () => null }) {
  const t = { ...DEFAULT_TUNING, ...tuning };
  const keysCache = new WeakMap();

  function question(key) {
    const q = catalog.get(parseKey(key).questionId);
    if (!q) throw new Error(`Unknown question in ${key}`);
    return q;
  }

  /** Questions of an area: by the room's kind, or the group's. */
  function questionsIn(home, area) {
    const parsed = parseArea(area);
    if ('group' in parsed) return catalog.forGroup(parsed.group);
    const room = findRoom(home, parsed.room);
    return room ? catalog.forKind(room.kind) : [];
  }

  /** All instances the home could have, in Sweep order. */
  function keysFor(home) {
    let keys = keysCache.get(home);
    if (!keys) {
      keys = areas(home).flatMap((area) => questionsIn(home, area).map((q) => instanceKey(q.id, area)));
      keysCache.set(home, keys);
    }
    return keys;
  }

  /** The local date seasons are judged by: today, or today moved to the developer's chosen month. */
  function seasonDate(now) {
    const date = zone.date(now);
    const month = seasonMonth();
    return month === null ? date : { ...date, month };
  }

  /**
   * The question applies to this home now: the area exists and has this question (a room by its kind), the
   * switches it needs are on, it is in season. Ignores N/A.
   */
  function isRelevant(home, key, now) {
    const { questionId, area } = parseKey(key);
    const q = catalog.get(questionId);
    if (!q || !hasArea(home, area)) return false;
    const parsed = parseArea(area);
    const fits = 'room' in parsed ? q.set !== null && kindSets(findRoom(home, parsed.room).kind).includes(q.set) : q.group === parsed.group;
    if (!fits) return false;
    if (q.requires !== null && !isEnabled(home, q.requires)) return false;
    return q.season === null || inSeason(q.season, seasonDate(now).month);
  }

  function isActive(household, key, now) {
    return isRelevant(household.home, key, now) && household.instances[key]?.notApplicable !== true;
  }

  function overdue(state, now) {
    return daysBetween(state.lastCleanAt, now) / state.interval;
  }

  function staggeredCleanAt(interval, now, random) {
    return now - interval * random.next() * DAY_MS;
  }

  /**
   * Creates state for relevant instances that have none yet and restarts seasonal ones entering a new season,
   * both with a staggered start so they reach the pool gradually (8.1, 7.8). Call before using the pool.
   * Returns the same household when nothing changes.
   */
  function refresh(household, now, random) {
    const date = seasonDate(now);
    let instances = null;
    for (const key of keysFor(household.home)) {
      if (!isRelevant(household.home, key, now)) continue;
      const q = question(key);
      const seasonStart = q.season ? seasonWindowStart(q.season, date) : null;
      const current = household.instances[key];
      let next = null;
      if (!current) {
        next = newState(q.days, staggeredCleanAt(q.days, now, random), { seasonStart });
      } else if (seasonStart !== null && current.seasonStart !== seasonStart) {
        next = { ...current, lastCleanAt: staggeredCleanAt(current.interval, now, random), dirtySeenAfterDays: null, seasonStart };
      }
      if (next) {
        instances ??= { ...household.instances };
        instances[key] = next;
      }
    }
    return instances ? { ...household, instances } : household;
  }

  /** Active instances that are due: at least one interval since the last clean. */
  function pool(household, now) {
    return keysFor(household.home).filter((key) => {
      const state = household.instances[key];
      return state !== undefined && isActive(household, key, now) && overdue(state, now) >= 1;
    });
  }

  /** (min(overdue, cap))² × priority, doubled for the area of the previous question in a series (8.2). */
  function weight(household, key, now, preferArea = null) {
    const capped = Math.min(overdue(household.instances[key], now), t.overdueCap);
    const boost = preferArea !== null && keyArea(key) === preferArea ? t.sameAreaBoost : 1;
    return capped * capped * PRIORITY_WEIGHT[question(key).priority] * boost;
  }

  /** Weighted random choice from the pool (8.2), or null when nothing is due. */
  function pick(household, now, random, { exclude = [], preferArea = null } = {}) {
    const excluded = new Set(exclude);
    const candidates = pool(household, now).filter((key) => !excluded.has(key));
    if (candidates.length === 0) return null;
    const weights = candidates.map((key) => weight(household, key, now, preferArea));
    let r = random.next() * weights.reduce((sum, w) => sum + w, 0);
    for (let i = 0; i < candidates.length; i++) {
      r -= weights[i];
      if (r < 0) return candidates[i];
    }
    return candidates.at(-1);
  }

  function clamp(key, interval) {
    const max = Math.max(t.minIntervalDays, question(key).days * t.maxIntervalFactor);
    return Math.min(Math.max(interval, t.minIntervalDays), max);
  }

  /** A clean (DONE, or YES after NO): rest for the full interval, shortened once if NO was seen (8.3). */
  function cleaned(key, state, now) {
    const dirtyAfter = state.dirtySeenAfterDays;
    let interval = state.interval;
    if (dirtyAfter !== null) {
      interval = clamp(key, t.elapsedAwareIntervals ? Math.min(state.interval, dirtyAfter * t.noFactor) : state.interval * t.noFactor);
    }
    return { ...state, interval, lastCleanAt: now, cleanedAt: now, dirtySeenAfterDays: null };
  }

  function lengthened(key, state, now) {
    const longer = state.interval * t.yesFactor;
    return clamp(key, t.elapsedAwareIntervals ? Math.max(longer, daysBetween(state.lastCleanAt, now)) : longer);
  }

  /** Applies an answer given in a series or a big clean. */
  function answer(household, key, given, now) {
    const state = household.instances[key];
    if (!state) return household;
    let updated;
    switch (given) {
      case 'YES':
        // YES after an unresolved NO means it was cleaned outside the app: like DONE. YES before the question was
        // due (a big clean asks early) says nothing about the interval being too short: it stays.
        if (state.dirtySeenAfterDays !== null) updated = cleaned(key, state, now);
        else if (overdue(state, now) < 1) updated = { ...state, lastCleanAt: now, cleanedAt: now };
        else updated = { ...state, interval: lengthened(key, state, now), lastCleanAt: now, cleanedAt: now };
        break;
      case 'NO':
        if (state.dirtySeenAfterDays !== null) return household;
        updated = { ...state, dirtySeenAfterDays: daysBetween(state.lastCleanAt, now) };
        break;
      case 'NOT_NOW':
        return household;
      case 'NOT_APPLICABLE':
        updated = { ...state, notApplicable: true };
        break;
      default:
        throw new Error(`Unknown answer ${given}`);
    }
    return withState(household, key, updated);
  }

  /** Estimated task time in minutes: learned, or the catalog's. */
  function minutes(household, key) {
    return household.instances[key]?.taskMinutes ?? question(key).minutes;
  }

  /** The estimate in milliseconds, whole seconds. */
  function taskDurationMs(household, key) {
    return Math.round(minutes(household, key) * 60) * 1000;
  }

  function learnTaskMinutes(key, state, taskTimeMs) {
    const fromCatalog = question(key).minutes;
    const current = state.taskMinutes ?? fromCatalog;
    const sample = taskTimeMs / MINUTE_MS;
    // Tapped right after starting, or forgot to tap DONE: not a real measurement.
    if (sample < current / t.taskTimeOutlier || sample > current * t.taskTimeOutlier) return state.taskMinutes;
    const learned = current * (1 - t.taskTimeWeight) + sample * t.taskTimeWeight;
    const low = Math.max(t.taskTimeMinMinutes, fromCatalog * t.taskTimeMinFactor);
    const high = Math.max(low, Math.min(t.taskTimeMaxMinutes, fromCatalog * t.taskTimeMaxFactor));
    return Math.min(Math.max(learned, low), high);
  }

  /**
   * DONE after the stopwatch: back to rest for the full interval, shortened once if NO was seen (8.3); the task
   * time learns from the real time when given (8.4).
   */
  function done(household, key, now, taskTimeMs = null) {
    const state = household.instances[key];
    if (!state) return household;
    const taskMinutes = taskTimeMs === null ? state.taskMinutes : learnTaskMinutes(key, state, taskTimeMs);
    return withState(household, key, { ...cleaned(key, state, now), taskMinutes });
  }

  /**
   * Applies a Sweep answer (6.5). A Sweep says nothing about how fast a place gets dirty, so it never lengthens
   * or shortens the interval: YES rests the question from today, NO makes it strongly overdue. The first Sweep
   * starts every answered question at its base interval.
   */
  function sweepAnswer(household, key, given, now, firstSweep) {
    const q = question(key);
    const existing = household.instances[key];
    const interval = firstSweep || !existing ? q.days : existing.interval;
    const seasonStart = q.season ? seasonWindowStart(q.season, seasonDate(now)) : null;
    const base = { ...(existing ?? newState(interval, now)), interval, seasonStart };
    let updated;
    switch (given) {
      case 'YES':
        updated = { ...base, lastCleanAt: now, cleanedAt: now, dirtySeenAfterDays: null, notApplicable: false };
        break;
      case 'NO':
        updated = { ...base, lastCleanAt: now - interval * t.overdueCap * DAY_MS, notApplicable: false };
        break;
      case 'NOT_APPLICABLE':
        updated = { ...base, notApplicable: true };
        break;
      default:
        throw new Error(`A Sweep has no ${given}`);
    }
    return withState(household, key, updated);
  }

  /** Brings back a question turned off with N/A. It returns like a new one: soon, but not all at once (8.1). */
  function restore(household, key, now, random) {
    const state = household.instances[key];
    if (!state?.notApplicable) return household;
    return withState(household, key, {
      ...state,
      notApplicable: false,
      lastCleanAt: staggeredCleanAt(state.interval, now, random),
      dirtySeenAfterDays: null,
    });
  }

  /** Questions turned off with N/A that would otherwise apply (their area exists, their switch is on). */
  function turnedOff(household, now) {
    return keysFor(household.home).filter((key) => household.instances[key]?.notApplicable === true && isRelevant(household.home, key, now));
  }

  /**
   * Developer mode (13.4): the household as if `byMs` had passed. Clean dates move back, so overdue and the
   * last-day rule behave as after that time; intervals and answers stay.
   */
  function aged(household, byMs) {
    const instances = {};
    for (const [key, state] of Object.entries(household.instances)) {
      instances[key] = { ...state, lastCleanAt: state.lastCleanAt - byMs, cleanedAt: state.cleanedAt === null ? null : state.cleanedAt - byMs };
    }
    return { ...household, instances };
  }

  return {
    catalog,
    tuning: t,
    question,
    questionsIn,
    keysFor,
    seasonDate,
    isRelevant,
    isActive,
    overdue,
    refresh,
    pool,
    weight,
    pick,
    answer,
    done,
    minutes,
    taskDurationMs,
    sweepAnswer,
    restore,
    turnedOff,
    aged,
  };
}

/** @returns {InstanceState} */
function newState(interval, lastCleanAt, extra = {}) {
  return {
    interval,
    lastCleanAt,
    dirtySeenAfterDays: null,
    notApplicable: false,
    seasonStart: null,
    taskMinutes: null,
    cleanedAt: null,
    ...extra,
  };
}

function withState(household, key, state) {
  return { ...household, instances: { ...household.instances, [key]: state } };
}
