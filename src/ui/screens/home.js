// The home screen. For now only the way into a Sweep; "Give me a task", Big
// clean, today's result and the last cleaning come in step 6 (specification 5).

import { areas } from '../../core/home.js';
import { areaHue, areaIcon, paintArea } from '../areas.js';
import { iconBlob } from '../blob.js';
import { button } from '../components.js';
import { h } from '../dom.js';
import { openSheet } from '../sheet.js';

/** Area for an address: 'room#3' <-> 'room:3' ('#' cannot be part of the address after '#'). */
export const areaToPath = (area) => area.replace('#', ':');
export const pathToArea = (part) => part.replace(':', '#');

export async function homeScreen(ctx) {
  const { engine, i18n, router } = ctx;
  const t = i18n.t;
  const { sweep } = await engine.snapshot();

  const sweepButton = sweep
    ? button(t(sweep.scope.kind === 'first' ? 'home.continueFirstSweep' : 'home.continueSweep'), () => router.navigate(sweep.scope.kind === 'first' ? '/sweep/first' : '/sweep'), { iconName: 'ui_sweep' })
    : button(t('home.sweep'), () => chooseScope(ctx), { iconName: 'ui_sweep' });

  const element = h(
    'div',
    { class: 'screen home' },
    h('div', { class: 'splash' }, h('img', { class: 'splash__icon', src: 'assets/icons/app.svg', alt: '' }), h('h1', { class: 'splash__name' }, t('app.name'))),
    h('div', { class: 'home__actions' }, sweepButton),
  );
  return { element };
}

/** What an on-demand Sweep covers (6.6): the whole home or one area, with how much is due in each. */
export async function chooseScope(ctx) {
  const { engine, i18n, router } = ctx;
  const t = i18n.t;
  const [{ household }, due] = await Promise.all([engine.snapshot(), engine.dueByArea()]);
  const home = household.home;
  const total = Object.values(due).reduce((sum, n) => sum + n, 0);
  let picked = null;

  const row = (iconName, label, count, path, hue) => {
    const enabled = count > 0;
    const el = h(
      'button',
      { type: 'button', class: `scope-row${hue ? ' area' : ''}`, disabled: !enabled, onclick: () => ((picked = path), sheet.close()) },
      iconBlob(iconName, { size: '3rem', animated: false, className: hue ? '' : 'blob--primary' }),
      h('span', { class: 'scope-row__text' }, h('span', { class: 't-title-m' }, label), h('span', { class: 'scope-row__due t-body-m' }, enabled ? t('scope.due', { count }) : t('scope.none'))),
    );
    return hue ? paintArea(el, hue) : el;
  };

  const content = h(
    'div',
    { class: 'scope' },
    row('ui_sweep', t('scope.home'), total, '/sweep', null),
    // Areas with something due, in Sweep order; the rest is not worth a Sweep now.
    areas(home)
      .filter((area) => due[area] > 0)
      .map((area) => row(areaIcon(area, home), i18n.areaName(area, home), due[area], `/sweep/area/${areaToPath(area)}`, areaHue(area, home))),
  );
  const sheet = openSheet({ title: t('scope.title'), content, closeLabel: t('scope.close') });
  await sheet.closed;
  if (picked) router.navigate(picked);
}
