// Puts the engine together for the app: the database, the scheduler on the full catalog, the local time zone.

import { createScheduler } from '../core/scheduler.js';
import { ianaZone } from '../core/time.js';
import { DB_NAME } from '../data/schema.js';
import { openStore } from '../data/store.js';
import { createEngine } from './engine.js';
import { createLock } from './lock.js';

/**
 * Opens the data and creates the engine. Rejects when the data cannot be opened (a missing migration, data from
 * a newer version of the app, a browser that keeps no data); nothing is deleted then.
 * @param {object} [options]
 * @param {string} [options.name] the database, the tabs' channel and the queue; developer mode on the real
 *   address uses its own, so the real data stays untouched (13.4)
 * @param {{ month: () => number | null, lastDoneAt: () => number | null }} [options.dev] developer mode's knobs
 */
export async function startEngine({ name = DB_NAME, dev = null } = {}) {
  const store = await openStore({ name });
  const zone = ianaZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const scheduler = createScheduler({ zone, seasonMonth: dev?.month });
  const engine = createEngine({ store, scheduler, zone, lock: createLock(`${name}-engine`), channelName: name, lastDoneAt: dev?.lastDoneAt });
  return { engine, scheduler, zone };
}
