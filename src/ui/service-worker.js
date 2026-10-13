// Registers the service worker and switches to a new version of the app only
// when the app is opened (specification 9.2): at start, or coming back to it
// after a while, and never in the middle of a series, task, Sweep or big clean.
// A phone keeps an installed app in the background for days, so coming back
// counts as opening it; it is also when the app looks for a new version, since
// without a page load the browser would not.

import { MINUTE_MS } from '../core/time.js';

/** Coming back after at least this long counts as opening the app. */
export const AWAY_MS = 5 * MINUTE_MS;
/** Looks for a new version at most this often when coming back. */
export const CHECK_EVERY_MS = 30 * MINUTE_MS;

/**
 * @param {object} options
 * @param {() => Promise<boolean>} options.isIdle nothing is going on: safe to switch
 * @param {ServiceWorkerContainer} [options.container]
 * @param {() => void} [options.reload]
 * @param {{ now: () => number }} [options.clock]
 */
export function createUpdater({ isIdle, container = navigator.serviceWorker, reload = () => location.reload(), clock = Date }) {
  // Without a controller this is the first install: its takeover needs no reload.
  const hadController = container.controller !== null;
  let registration = null;
  let switching = false;
  // Another tab switched to a new version; this page still runs the old one.
  let stale = false;
  let lastCheck = clock.now();
  let hiddenAt = null;

  container.addEventListener('controllerchange', () => {
    if (switching) reload();
    else if (hadController) stale = true;
  });

  return {
    /** Registers the service worker; the app still works online without it (plain http on a LAN address). */
    async register(url = './sw.js') {
      try {
        registration = await container.register(url);
      } catch (error) {
        console.warn('Service worker not registered:', error);
      }
      return registration;
    },

    /**
     * When nothing is going on, switches to a version that is waiting (the page reloads once the new service
     * worker takes over) or reloads into the one another tab switched to. Resolves true when it did.
     */
    async applyIfIdle() {
      const waiting = registration?.waiting ?? null;
      if ((!waiting && !stale) || switching || !(await isIdle())) return false;
      if (waiting) {
        switching = true;
        waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        reload();
      }
      return true;
    },

    /** The app went to the background. */
    hidden() {
      hiddenAt = clock.now();
    },

    /**
     * The app came back: after a while away it counts as opening, so a waiting version goes in (resolves true,
     * the page reloads). Otherwise it looks for a new version now and then; one found waits for the next opening.
     */
    async visible() {
      const away = hiddenAt !== null && clock.now() - hiddenAt >= AWAY_MS;
      hiddenAt = null;
      if (away && (await this.applyIfIdle())) return true;
      if (registration && clock.now() - lastCheck >= CHECK_EVERY_MS) {
        lastCheck = clock.now();
        registration.update().catch(() => {});
      }
      return false;
    },
  };
}
