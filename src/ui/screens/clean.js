// Starting a big clean (specification 4.4): a time budget and the areas, with
// the plan the choice gives — how many questions and at most how much work.

import { areas } from '../../core/home.js';
import { MINUTE_MS } from '../../core/time.js';
import { areaHue, areaIcon, paintArea } from '../areas.js';
import { iconBlob } from '../blob.js';
import { button, iconButton } from '../components.js';
import { h } from '../dom.js';

const BUDGETS = [
  { key: 'clean.budget30', ms: 30 * MINUTE_MS },
  { key: 'clean.budget60', ms: 60 * MINUTE_MS },
  { key: 'clean.budget120', ms: 120 * MINUTE_MS },
  { key: 'clean.budgetNone', ms: null },
];

/** "45 min", "1 h" or "1 h 5 min", every started minute counted. */
export function workTime(t, minutes) {
  const total = Math.ceil(minutes);
  if (total < 60) return t('clean.minutes', { minutes: total });
  const hours = Math.floor(total / 60);
  return total % 60 === 0 ? t('clean.wholeHours', { hours }) : t('clean.hours', { hours, minutes: total % 60 });
}

export async function cleanScreen(ctx) {
  const { engine, i18n, router } = ctx;
  const t = i18n.t;
  const [{ household, activity }, options] = await Promise.all([engine.snapshot(), engine.cleanOptions()]);
  if (activity.kind !== 'idle') {
    // Something is going on: it comes first.
    queueMicrotask(() => router.navigate('/', { replace: true }));
    return { element: h('div') };
  }
  const home = household.home;
  const withWork = new Map(options.map((o) => [o.area, o]));
  let budget = BUDGETS[1].ms;
  const chosen = new Set(withWork.keys());

  const plan = h('p', { class: 'clean__plan t-title-m' });
  const hint = h('p', { class: 'clean__hint t-body-m' });
  const start = button(t('clean.start'), () => go(), { className: 'button--lavender' });

  async function preview() {
    const result = chosen.size ? await engine.previewClean([...chosen], budget) : null;
    if (result) {
      plan.textContent = t('clean.plan', { count: result.questions, time: workTime(t, result.minutes) });
      hint.textContent = t('clean.planHint');
    } else {
      plan.textContent = '';
      hint.textContent = t('clean.planEmpty');
    }
    start.disabled = !result;
  }

  async function go() {
    start.disabled = true;
    const step = await engine.startClean([...chosen], budget);
    if (step.nothingDue) return preview();
    router.navigate('/', { replace: true });
  }

  const budgets = h(
    'div',
    { class: 'segments', role: 'radiogroup', 'aria-label': t('clean.budget') },
    BUDGETS.map((b) =>
      h('button', { type: 'button', class: 'segment', role: 'radio', 'aria-checked': String(b.ms === budget), onclick: (event) => pickBudget(b.ms, event.currentTarget) }, t(b.key)),
    ),
  );

  function pickBudget(ms, el) {
    budget = ms;
    for (const segment of budgets.children) segment.setAttribute('aria-checked', String(segment === el));
    preview();
  }

  const list = h(
    'div',
    { class: 'settings__group clean__areas' },
    areas(home).map((area) => {
      const option = withWork.get(area);
      const id = `clean-${area.replace('#', '-')}`;
      const toggle = (event) => {
        if (event.target.checked) chosen.add(area);
        else chosen.delete(area);
        preview();
      };
      const box = h('input', { class: 'check', type: 'checkbox', id, checked: Boolean(option), disabled: !option, onchange: toggle });
      return paintArea(
        h(
          'label',
          { class: `setting area${option ? '' : ' setting--off'}`, for: id },
          iconBlob(areaIcon(area, home), { size: '2.75rem', animated: false }),
          h('span', { class: 'setting__text' }, h('span', { class: 't-title-m' }, i18n.areaName(area, home)), h('span', { class: 'setting__sub t-body-m' }, option ? t('clean.areaQuestions', { count: option.questions, time: workTime(t, option.minutes) }) : t('clean.areaNone'))),
          box,
        ),
        areaHue(area, home),
      );
    }),
  );

  const element = h(
    'div',
    { class: 'screen clean-setup' },
    h('header', { class: 'settings__bar' }, iconButton('ui_back', t('settings.back'), () => history.back()), h('h1', { class: 't-title-l' }, t('clean.title'))),
    h(
      'div',
      { class: 'clean-setup__scroll' },
      h('div', { class: 'clean-setup__hero' }, iconBlob('ui_broom', { size: 'min(8rem, 16vh)', className: 'blob--lavender' })),
      h('p', { class: 'setup__text t-body-m' }, t('clean.text')),
      h('h2', { class: 'settings__heading t-label-l' }, t('clean.budget')),
      budgets,
      h('h2', { class: 'settings__heading t-label-l' }, t('clean.areas')),
      list,
    ),
    h('div', { class: 'clean-setup__footer' }, plan, hint, start),
  );
  await preview();
  return { element };
}
