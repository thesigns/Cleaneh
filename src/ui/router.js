// Screens by the address after '#', through the browser history, so the Back
// button and gesture go to the previous screen like in a native app (9.5).
// A screen may react to leaving (a Sweep treats Back like X) and stay.
// Every entry knows how deep it is (`history.state.depth`, the app's first entry
// is 0). The home screen always sits on the first entry, so Back there closes
// the app: going home goes back through the history instead of adding an entry.

/**
 * A screen: its element, and optionally `leave()` called before the user goes elsewhere. `leave()` resolves
 * true to stay on the screen (the history entry is put back), false to go; `destroy()` runs after it is gone.
 * @typedef {{ element: HTMLElement, leave?: () => Promise<boolean>, destroy?: () => void }} Screen
 */

/**
 * @param {HTMLElement} rootElement
 * @param {(path: string) => Screen | Promise<Screen>} screenFor builds the screen of a path ('/', '/sweep')
 */
/** How deep the current history entry is; 0 for the app's first entry (or one the router did not make). */
export const depthOf = () => history.state?.depth ?? 0;

export function createRouter(rootElement, screenFor) {
  let current = null;
  let currentPath = null;
  let restoring = false;
  let queue = Promise.resolve();

  const pathOf = () => decodeURI(location.hash.replace(/^#/, '')) || '/';
  const urlOf = (path) => `#${encodeURI(path)}`;

  async function show(path, force = false) {
    if (!force && path === currentPath) return;
    if (!force && current?.leave) {
      if (await current.leave()) {
        // Stay: put the screen's address back without building it again.
        restoring = true;
        history.pushState({ depth: depthOf() + 1 }, '', urlOf(currentPath));
        restoring = false;
        return;
      }
    }
    const next = await screenFor(path);
    current?.destroy?.();
    current = next;
    currentPath = path;
    rootElement.replaceChildren(next.element);
    window.scrollTo(0, 0);
  }

  const run = (path, force = false) => (queue = queue.then(() => show(path, force)).catch((error) => console.error(error)));

  /** Goes `steps` entries back without showing the screens on the way. */
  function goBack(steps) {
    return new Promise((resolve) => {
      restoring = true;
      const done = () => {
        clearTimeout(timer);
        window.removeEventListener('popstate', done);
        restoring = false;
        resolve();
      };
      // Should the history be shorter than it says, go on from wherever it is.
      const timer = setTimeout(done, 1000);
      window.addEventListener('popstate', done);
      history.go(-steps);
    });
  }

  /** Back to the app's first entry, showing `path` there. */
  function root(path) {
    queue = queue
      .then(async () => {
        if (depthOf() > 0) await goBack(depthOf());
        history.replaceState({ depth: 0 }, '', urlOf(path));
        await show(path);
      })
      .catch((error) => console.error(error));
    return queue;
  }

  // Entries with the same address (an open sheet) are handled by whoever added them.
  window.addEventListener('popstate', () => {
    if (!restoring) run(pathOf());
  });

  return {
    /**
     * Goes to a path; `replace` swaps the current history entry instead of adding one. Home ('/') is always
     * the app's first entry.
     */
    navigate(path, { replace = false } = {}) {
      if (path === '/') return root(path);
      if (replace) history.replaceState({ depth: depthOf() }, '', urlOf(path));
      else history.pushState({ depth: depthOf() + 1 }, '', urlOf(path));
      return run(path);
    },
    /** Starts over at `path` on the app's first entry, with nothing to go back to (the setup after "Start over"). */
    root,
    /** Builds the current path's screen again, e.g. after a change in another tab. */
    refresh: () => run(pathOf(), true),
    start() {
      if (typeof history.state?.depth !== 'number') history.replaceState({ ...history.state, depth: 0 }, '', location.href);
      return run(pathOf());
    },
    get path() {
      return currentPath;
    },
  };
}
