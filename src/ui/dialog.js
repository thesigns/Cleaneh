// A small centered dialog with a safe, highlighted choice and another one.
// Back, Escape and a tap outside take the safe choice. Own history entry (9.5).

import { button } from './components.js';
import { h } from './dom.js';

/**
 * @param {object} options
 * @param {Node} [options.art] e.g. an icon blob on top
 * @param {string} options.title
 * @param {Node[]} options.body
 * @param {string} options.safeLabel the highlighted button, and what dismissing means
 * @param {string} options.otherLabel
 * @param {string} [options.otherTone] tone class for the other button (e.g. 'tone-na')
 * @returns {Promise<'safe' | 'other'>}
 */
export function choose({ art = null, title, body, safeLabel, otherLabel, otherTone = '' }) {
  let resolve;
  const result = new Promise((r) => (resolve = r));
  let choice = 'safe';
  let open = true;

  const panel = h(
    'div',
    { class: 'dialog__panel', role: 'alertdialog', 'aria-modal': 'true', 'aria-label': title },
    art,
    h('h2', { class: 'dialog__title t-headline-s' }, title),
    ...body,
    h(
      'div',
      { class: 'dialog__actions' },
      button(otherLabel, () => close('other'), { variant: 'text', className: `dialog__other ${otherTone}` }),
      button(safeLabel, () => close('safe'), { className: 'dialog__safe' }),
    ),
  );
  const element = h('div', { class: 'dialog', onclick: (event) => event.target === element && close('safe') }, panel);

  function finish() {
    if (!open) return;
    open = false;
    window.removeEventListener('popstate', onPop);
    document.removeEventListener('keydown', onKey);
    element.classList.add('dialog--closing');
    setTimeout(() => element.remove(), 180);
    resolve(choice);
  }
  const onPop = () => finish();
  const onKey = (event) => event.key === 'Escape' && close('safe');
  function close(which) {
    choice = which;
    if (open) history.back();
  }

  history.pushState({ dialog: true }, '', location.href);
  window.addEventListener('popstate', onPop);
  document.addEventListener('keydown', onKey);
  document.body.append(element);
  panel.querySelector('.dialog__safe')?.focus({ preventScroll: true });
  return result;
}
