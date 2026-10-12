// Installing the app on the home screen (specification 9.1) and asking for
// persistent storage (9.3).

let deferred = null;

/**
 * Keeps Chrome's install prompt for later (the install button). Call once at start, before the browser
 * fires `beforeinstallprompt`.
 */
export function watchInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event;
  });
  window.addEventListener('appinstalled', () => (deferred = null));
}

/** Whether the app runs installed (from the home screen, without the browser's bar). */
export function isInstalled() {
  return globalThis.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
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
