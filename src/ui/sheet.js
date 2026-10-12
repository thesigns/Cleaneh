// A bottom sheet over the current screen. It gets its own history entry, so
// Back closes it like in a native app (9.5).

import { h } from './dom.js';
import { iconButton } from './components.js';

/**
 * Opens a sheet with a title and content; resolves when it is closed (by the close button, a tap outside,
 * Escape or Back). `close()` on the returned object closes it from code.
 */
export function openSheet({ title, content, closeLabel }) {
  let resolveClosed;
  const closed = new Promise((resolve) => (resolveClosed = resolve));
  let open = true;

  const panel = h(
    'div',
    { class: 'sheet__panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'sheet__head' }, h('h2', { class: 'sheet__title t-title-l' }, title), iconButton('ui_close', closeLabel, () => close())),
    h('div', { class: 'sheet__body' }, content),
  );
  const element = h('div', { class: 'sheet', onclick: (event) => event.target === element && close() }, panel);

  function finish() {
    if (!open) return;
    open = false;
    window.removeEventListener('popstate', onPop);
    document.removeEventListener('keydown', onKey);
    element.classList.add('sheet--closing');
    setTimeout(() => element.remove(), 200);
    resolveClosed();
  }

  /** Closes through the history, so the sheet's entry goes away too. */
  function close() {
    if (open) history.back();
  }

  const onPop = () => finish();
  const onKey = (event) => event.key === 'Escape' && close();

  history.pushState({ sheet: true }, '', location.href);
  window.addEventListener('popstate', onPop);
  document.addEventListener('keydown', onKey);
  document.body.append(element);
  panel.querySelector('button')?.focus({ preventScroll: true });

  // To go elsewhere from the sheet: close it, wait for `closed`, then navigate, so no extra entry stays behind.
  return { closed, close };
}
