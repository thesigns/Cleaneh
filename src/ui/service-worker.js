// Registers the service worker and switches to a new version of the app only
// when the app is opened (specification 9.2).

/**
 * Registers the service worker. When a new version is already waiting, it is
 * activated and the page reloads once, before the user has done anything.
 * A version that arrives while the app is open waits for the next opening.
 */
export async function setUpServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  // Without a controller this is the first install: nothing to reload.
  const hadController = navigator.serviceWorker.controller !== null;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    location.reload();
  });

  try {
    const registration = await navigator.serviceWorker.register('./sw.js');
    registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
  } catch (error) {
    // The app still works online without it (e.g. plain http on a LAN address).
    console.warn('Service worker not registered:', error);
  }
}
