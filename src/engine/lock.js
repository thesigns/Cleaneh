// Runs state changes one at a time, also across tabs of the app (specification 13.2).

/**
 * A lock: `run(work)` waits for the work before it, here and in other tabs, then runs `work`.
 * With Web Locks the queue is shared by every tab of the origin; without them (old browsers), only by this tab.
 * @returns {{ run: <T>(work: () => Promise<T>) => Promise<T> }}
 */
export function createLock(name, locks = globalThis.navigator?.locks) {
  if (locks) return { run: (work) => locks.request(name, work) };
  let tail = Promise.resolve();
  return {
    run(work) {
      const result = tail.then(work);
      tail = result.catch(() => {});
      return result;
    },
  };
}
