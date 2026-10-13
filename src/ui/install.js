// Installing the app on the home screen (specification 9.1) and asking for
// persistent storage (9.3).

let deferred = null;
// Installed from this page: the page itself still runs in the browser.
let installedHere = false;
const listeners = new Set();
const changed = () => listeners.forEach((listener) => listener());

/**
 * Keeps Chrome's install prompt for later (the install button). Call once at start, before the browser
 * fires `beforeinstallprompt`.
 */
export function watchInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event;
    changed();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installedHere = true;
    changed();
  });
}

/** Calls `listener` when the install window becomes ready (it may come late) or the app got installed. */
export function onInstallChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether the app is installed: runs from the home screen (without the browser's bar) or was installed from here. */
export function isInstalled() {
  return installedHere || globalThis.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
}

/**
 * How this browser installs: 'prompt' (Chrome's install window is ready), 'ios' (Safari: Share, then Add to
 * Home Screen), 'other' (from the browser's menu, if at all).
 */
export function installWay() {
  if (deferred) return 'prompt';
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios ? 'ios' : 'other';
}

/** Shows Chrome's install window. Resolves true when the user installed. */
export async function promptInstall() {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === 'accepted';
}

/** Asks the browser to keep the data even when space runs low (installed apps usually get it without asking). */
export async function requestPersistence() {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
