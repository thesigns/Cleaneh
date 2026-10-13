// Reads and writes the state of core (household, activity, Sweep in
// progress), the settings and the history in IndexedDB (specification 13.3).
// Every commit is one transaction and writes only what changed.

import { IDLE } from '../core/loop.js';
import { householdChanges } from './changes.js';
import { inTransaction, openDatabase, promisify } from './idb.js';
import { DB_NAME, MIGRATIONS, SCHEMA_VERSION, STORES, migrationSteps } from './schema.js';

/**
 * @typedef {object} Settings
 * @property {string | null} language 'en' or 'pl'; null = from the browser
 * @property {'light' | 'dark' | null} theme null = from the system
 * @property {boolean} sound sound and vibration
 * @property {string} onboarding the setup step to come back to; 'done' after it
 * @property {boolean} installPromptShown
 */

/** @type {Settings} */
export const DEFAULT_SETTINGS = Object.freeze({ language: null, theme: null, sound: true, onboarding: 'welcome', installPromptShown: false });

/**
 * What one commit writes. Fields left out stay as they are.
 * @typedef {object} Commit
 * @property {import('../core/scheduler.js').Household} [before] the household as loaded
 * @property {import('../core/scheduler.js').Household} [after] the household to save; only changes are written
 * @property {import('../core/loop.js').Activity} [activity]
 * @property {import('../core/sweep.js').Sweep | null} [sweep] null clears the Sweep in progress
 * @property {Settings} [settings]
 * @property {import('../core/loop.js').LogEntry[]} [log] answers for the history
 * @property {object} [series] a finished series for the history
 * @property {object} [sweepRecord] a finished Sweep for the history
 */

/**
 * Opens the database, running any migrations first. Rejects, without touching the data, when a migration is
 * missing or the data is from a newer version of the app. `version` and `migrations` are for tests.
 */
export async function openStore({ indexedDB = globalThis.indexedDB, name = DB_NAME, version = SCHEMA_VERSION, migrations = MIGRATIONS } = {}) {
  const db = await openDatabase(indexedDB, name, version, (database, transaction, oldVersion, newVersion) => {
    for (const migrate of migrationSteps(oldVersion, newVersion, migrations)) migrate(database, transaction);
  });

  const versionChangeListeners = new Set();
  // A newer version of the app opened the database in another tab: let it upgrade.
  db.onversionchange = () => {
    db.close();
    for (const listener of versionChangeListeners) listener();
  };

  /** Everything core needs, read in one transaction. */
  function load() {
    return inTransaction(db, ['rooms', 'instances', 'state'], 'readonly', async (tx) => {
      const state = tx.objectStore('state');
      const [rooms, keys, values, features, activity, sweep, settings] = await Promise.all([
        promisify(tx.objectStore('rooms').getAll()),
        promisify(tx.objectStore('instances').getAllKeys()),
        promisify(tx.objectStore('instances').getAll()),
        promisify(state.get('features')),
        promisify(state.get('activity')),
        promisify(state.get('sweep')),
        promisify(state.get('settings')),
      ]);
      const instances = {};
      keys.forEach((key, i) => (instances[key] = values[i]));
      return {
        household: { home: { rooms: rooms.sort((a, b) => a.id - b.id), features: features ?? [] }, instances },
        activity: activity ?? IDLE,
        sweep: sweep ?? null,
        settings: { ...DEFAULT_SETTINGS, ...settings },
      };
    });
  }

  /** @param {Commit} change */
  function commit(change) {
    return inTransaction(db, STORES, 'readwrite', (tx) => {
      if (change.before && change.after) {
        const { rooms, features, instances, removed } = householdChanges(change.before, change.after);
        for (const room of rooms) tx.objectStore('rooms').put(room);
        if (features !== null) tx.objectStore('state').put(features, 'features');
        for (const [key, state] of instances) tx.objectStore('instances').put(state, key);
        for (const key of removed) tx.objectStore('instances').delete(key);
      }
      const state = tx.objectStore('state');
      if (change.activity !== undefined) state.put(change.activity, 'activity');
      if (change.sweep !== undefined) {
        if (change.sweep === null) state.delete('sweep');
        else state.put(change.sweep, 'sweep');
      }
      if (change.settings !== undefined) state.put(change.settings, 'settings');
      for (const entry of change.log ?? []) tx.objectStore('answers').add(entry);
      if (change.series) tx.objectStore('series').add(change.series);
      if (change.sweepRecord) tx.objectStore('sweeps').add(change.sweepRecord);
    });
  }

  /** Time of the latest DONE, or null (specification 5.1). */
  function lastDoneAt() {
    return inTransaction(db, ['answers'], 'readonly', async (tx) => {
      const range = IDBKeyRange.bound(['DONE', -Infinity], ['DONE', Infinity]);
      const cursor = await promisify(tx.objectStore('answers').index('kind_at').openCursor(range, 'prev'));
      return cursor ? cursor.value.at : null;
    });
  }

  /** DONE entries from `since` on, for today's summary. */
  function doneSince(since) {
    return inTransaction(db, ['answers'], 'readonly', (tx) =>
      promisify(tx.objectStore('answers').index('kind_at').getAll(IDBKeyRange.bound(['DONE', since], ['DONE', Infinity]))),
    );
  }

  /** Whether the first Sweep was completed (the end of the setup). */
  function firstSweepDone() {
    return inTransaction(db, ['sweeps'], 'readonly', async (tx) => {
      const firsts = await promisify(tx.objectStore('sweeps').index('scope').getAll('first'));
      return firsts.some((record) => record.completed);
    });
  }

  /** The whole history, oldest first. */
  function history() {
    return inTransaction(db, ['answers', 'series', 'sweeps'], 'readonly', async (tx) => {
      const [answers, series, sweeps] = await Promise.all(['answers', 'series', 'sweeps'].map((name) => promisify(tx.objectStore(name).getAll())));
      return { answers, series, sweeps };
    });
  }

  /** Deletes everything ("Start over"). */
  function reset() {
    return inTransaction(db, STORES, 'readwrite', (tx) => {
      for (const name of STORES) tx.objectStore(name).clear();
    });
  }

  return {
    load,
    commit,
    lastDoneAt,
    doneSince,
    firstSweepDone,
    history,
    reset,
    close: () => db.close(),
    /** Called when a newer version of the app needs the database; this connection is closed by then. */
    onVersionChange(listener) {
      versionChangeListeners.add(listener);
      return () => versionChangeListeners.delete(listener);
    },
  };
}
