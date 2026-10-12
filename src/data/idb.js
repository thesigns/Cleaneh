// A thin promise layer over IndexedDB.

/** A request's result as a promise. */
export function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Resolves when the transaction commits, rejects when it aborts. */
export function completion(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new DOMException('Transaction aborted', 'AbortError'));
  });
}

/**
 * Opens a database. `upgrade(db, transaction, oldVersion, newVersion)` runs in the version change transaction;
 * if it throws, the upgrade is aborted, nothing changes and the promise rejects with that error.
 * @param {IDBFactory} factory
 */
export function openDatabase(factory, name, version, upgrade) {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, version);
    request.onupgradeneeded = (event) => {
      try {
        upgrade(request.result, request.transaction, event.oldVersion, event.newVersion);
      } catch (error) {
        reject(error);
        request.transaction.abort();
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Runs `work(transaction)` in a transaction and resolves with its result once the transaction commits.
 * `work` may await requests of this transaction, but nothing else.
 */
export async function inTransaction(db, stores, mode, work) {
  const transaction = db.transaction(stores, mode);
  const committed = completion(transaction);
  let result;
  try {
    result = await work(transaction);
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // Already finished.
    }
    committed.catch(() => {});
    throw error;
  }
  await committed;
  return result;
}
