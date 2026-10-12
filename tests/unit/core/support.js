// Shared fixtures for core tests, like TestSupport.kt in Cleanerr.

import { createCatalog, question } from '../../../src/core/catalog.js';
import { addRoom, emptyHome, groupArea, roomArea } from '../../../src/core/home.js';
import { createScheduler } from '../../../src/core/scheduler.js';
import { DAY_MS, MINUTE_MS, fixedZone } from '../../../src/core/time.js';

export const ZONE = fixedZone(0);

/** A Wednesday in July: garden questions are in season. */
export const T0 = Date.parse('2026-07-01T08:00:00Z');

export const days = (value) => value * DAY_MS;
export const minutes = (value) => value * MINUTE_MS;

/** Small catalog for precise tests: two kitchen questions, one per room, one seasonal garden, one gated by CAT. */
export const SMALL = createCatalog([
  question({ id: 'a', minutes: 5, days: 2, priority: 'NORMAL', set: 'KITCHEN' }),
  question({ id: 'b', minutes: 3, days: 4, priority: 'HYGIENE', set: 'KITCHEN' }),
  question({ id: 'c', minutes: 10, days: 7, priority: 'NORMAL', set: 'ROOM_BASE' }),
  question({ id: 'd', minutes: 15, days: 7, priority: 'NORMAL', season: [5, 9], set: 'GARDEN' }),
  question({ id: 'e', minutes: 3, days: 1, priority: 'HYGIENE', requires: 'CAT', group: 'PETS' }),
]);

/** A kitchen (room 1) and a room (room 2). */
export const HOME = addRoom(addRoom(emptyHome(), 'KITCHEN'), 'ROOM');

/** HOME with a garden (room 3). */
export const WITH_GARDEN = addRoom(HOME, 'GARDEN');

export const KITCHEN = roomArea(1);
export const ROOM1 = roomArea(2);
export const GARDEN = roomArea(3);
export const PETS = groupArea('PETS');

export const A = `a@${KITCHEN}`;
export const B = `b@${KITCHEN}`;
export const C = `c@${ROOM1}`;
export const D = `d@${GARDEN}`;
export const E = `e@${PETS}`;

export function smallScheduler(tuning = {}) {
  return createScheduler({ zone: ZONE, catalog: SMALL, tuning });
}

/** State with the given interval, last cleaned `daysAgo` before T0. */
export function state(interval, daysAgo, { pendingShrink = false, ...rest } = {}) {
  return {
    interval,
    lastCleanAt: T0 - days(daysAgo),
    dirtySeenAfterDays: pendingShrink ? daysAgo : null,
    notApplicable: false,
    seasonStart: null,
    taskMinutes: null,
    cleanedAt: null,
    ...rest,
  };
}

/** A household from a home and [key, state] pairs. */
export function household(home, ...states) {
  return { home, instances: Object.fromEntries(states) };
}
