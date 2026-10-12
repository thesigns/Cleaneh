// Screens by the address after '#', through the browser history, so the Back
// button and gesture go to the previous screen like in a native app (9.5).
// A screen may react to leaving (a Sweep treats Back like X) and stay.

/**
 * A screen: its element, and optionally `leave()` called before the user goes elsewhere. `leave()` resolves
 * true to stay on the screen (the history entry is put back), false to go; `destroy()` runs after it is gone.
 * @typedef {{ element: HTMLElement, leave?: () => Promise<boolean>, destroy?: () => void }} Screen
 */

/**
 * @param {HTMLElement} root
 * @param {(path: string) => Screen | Promise<Screen>} screenFor builds the screen of a path ('/', '/sweep')
 */
export function createRouter(root, screenFor) {
  let current = null;
  let currentPath = null;
  let restoring = false;
  let queue = Promise.resolve();

  const pathOf = () => decodeURI(location.hash.replace(/^#/, '')) || '/';

  async function show(path, force = false) {
    if (!force && path === currentPath) return;
    if (!force && current?.leave) {
      if (await current.leave()) {
        // Stay: put the screen's address back without building it again.
        restoring = true;
        history.pushState(null, '', `#${encodeURI(currentPath)}`);
        restoring = false;
        return;
      }
    }
    const next = await screenFor(path);
    current?.destroy?.();
    current = next;
    currentPath = path;
    root.replaceChildren(next.element);
    window.scrollTo(0, 0);
  }

  const run = (path, force = false) => (queue = queue.then(() => show(path, force)).catch((error) => console.error(error)));

  // Entries with the same address (an open sheet) are handled by whoever added them.
  window.addEventListener('popstate', () => {
    if (!restoring) run(pathOf());
  });

  return {
    /** Goes to a path; `replace` swaps the current history entry instead of adding one. */
    navigate(path, { replace = false } = {}) {
      const url = `#${encodeURI(path)}`;
      if (replace) history.replaceState(null, '', url);
      else history.pushState(null, '', url);
      return run(path);
    },
    /** Builds the current path's screen again, e.g. after a change in another tab. */
    refresh: () => run(pathOf(), true),
    start: () => run(pathOf()),
    get path() {
      return currentPath;
    },
  };
}
