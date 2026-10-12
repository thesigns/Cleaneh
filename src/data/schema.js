// The database schema and its migrations (specification 13.3).
//
// The schema version is the IndexedDB version. Opening the database runs, in
// one version change transaction, every migration from the stored version up
// to SCHEMA_VERSION. A missing migration fails the opening and leaves the data
// as it was; data never gets deleted to make room for a new version. Every
// migration has a test that opens an old database with sample data, as the
// app does.

export const DB_NAME = 'cleaneh';

export const SCHEMA_VERSION = 1;

/**
 * Migration to each version, run in the version change transaction: `(db, transaction) => void`. It may start
 * requests (cursors, puts) on the transaction; later migrations see their results.
 */
export const MIGRATIONS = {
  /**
   * Version 1, the first one:
   * - rooms: the user's rooms (also removed ones), by id
   * - instances: state of each question in each area, by instance key ('kitchen_counter_clean@room#2')
   * - state: 'features', 'activity', 'sweep' (in progress) and 'settings', as plain values
   * - answers: answer history (YES, NO, NOT_NOW, NOT_APPLICABLE, STOP, START, DONE with its real time, GIVE_UP)
   * - series, sweeps: one record per finished series and Sweep
   */
  1(db) {
    db.createObjectStore('rooms', { keyPath: 'id' });
    db.createObjectStore('instances');
    db.createObjectStore('state');
    const answers = db.createObjectStore('answers', { keyPath: 'id', autoIncrement: true });
    answers.createIndex('kind_at', ['kind', 'at']);
    db.createObjectStore('series', { keyPath: 'id', autoIncrement: true });
    const sweeps = db.createObjectStore('sweeps', { keyPath: 'id', autoIncrement: true });
    sweeps.createIndex('scope', 'scope');
  },
};

/** The migrations to run from `oldVersion` to `newVersion`, in order. Throws when one is missing. */
export function migrationSteps(oldVersion, newVersion, migrations = MIGRATIONS) {
  if (newVersion < oldVersion) throw new Error(`The data is from a newer version of the app (schema ${oldVersion}, this app ${newVersion})`);
  const steps = [];
  for (let version = oldVersion + 1; version <= newVersion; version++) {
    const migration = migrations[version];
    if (typeof migration !== 'function') throw new Error(`No migration to schema version ${version}`);
    steps.push(migration);
  }
  return steps;
}

/** All object stores, for transactions that touch everything. */
export const STORES = ['rooms', 'instances', 'state', 'answers', 'series', 'sweeps'];
