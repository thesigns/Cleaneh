// Puts the engine together for the app: the database, the scheduler on the full catalog, the local time zone.

import { createScheduler } from '../core/scheduler.js';
import { ianaZone } from '../core/time.js';
import { openStore } from '../data/store.js';
import { createEngine } from './engine.js';

/**
 * Opens the data and creates the engine. Rejects when the data cannot be opened (a missing migration, data from
 * a newer version of the app, a browser that keeps no data); nothing is deleted then.
 */
export async function startEngine() {
  const store = await openStore();
  const zone = ianaZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const scheduler = createScheduler({ zone });
  return { engine: createEngine({ store, scheduler, zone }), scheduler, zone };
}
