// Something over the current screen (a sheet, a dialog, the reward, the room
// editor) with its own history entry, so Back closes it like in a native app (9.5).
// Layers can be stacked (a confirmation over the room editor): going back
// closes only the layers above the history entry it lands on.

let nextId = Date.now();

/**
 * Opens a layer: adds a history entry and calls `onClosed` once it is gone (Back, or `close()`).
 * @param {() => void} onClosed
 */
export function historyLayer(onClosed) {
  const id = ++nextId;
  let open = true;
  const onPop = (event) => {
    // Still under the entry we landed on (a layer above this one closed): stay.
    if (!open || (event.state?.layer ?? 0) >= id) return;
    open = false;
    window.removeEventListener('popstate', onPop);
    onClosed();
  };
  history.pushState({ layer: id }, '', location.href);
  window.addEventListener('popstate', onPop);
  return {
    /** Closes through the history, so the layer's entry goes away too. */
    close() {
      if (open) history.back();
    },
    get open() {
      return open;
    },
  };
}
