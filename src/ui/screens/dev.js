// Developer mode (specification 13.4): time shift, the season month, quick language and theme, a pretend
// last cleaning, and the pool preview. app.js routes here only in the development version.

import { keyArea } from '../../core/scheduler.js';
import { DAY_MS, HOUR_MS } from '../../core/time.js';
import { GROUP_HUES, areaHue, areaIcon, paintArea } from '../areas.js';
import { iconBlob } from '../blob.js';
import { button } from '../components.js';
import { devPref, setDevPref } from '../dev.js';
import { h, replaceChildren } from '../dom.js';
import { LANGUAGES } from '../i18n/index.js';
import { THEMES } from '../theme.js';
import { pastLine } from './home.js';
import { page, row, section, setTheme, themeKey } from './settings.js';

const AGES = [
  { key: 'dev.age12h', done: 'dev.aged12h', ms: 12 * HOUR_MS },
  { key: 'dev.age1d', done: 'dev.aged1d', ms: DAY_MS },
  { key: 'dev.age1w', done: 'dev.aged1w', ms: 7 * DAY_MS },
];

const LAST = [
  { choice: null, key: 'dev.lastReal' },
  { choice: 'hour', key: 'dev.lastHour', agoMs: HOUR_MS },
  { choice: '2d', key: 'dev.last2d', agoMs: 2 * DAY_MS },
  { choice: '2w', key: 'dev.last2w', agoMs: 14 * DAY_MS },
];

/** A group of choices, one checked: `options` are `{ value, label }`; `pick(value)` on a tap. */
function segments(label, options, current, pick, className = '') {
  const el = h(
    'div',
    { class: `segments segments--primary ${className}`.trim(), role: 'radiogroup', 'aria-label': label },
    options.map((o) =>
      h('button', {
        type: 'button',
        class: 'segment',
        role: 'radio',
        'aria-checked': String(o.value === current),
        onclick: (event) => {
          for (const segment of el.children) segment.setAttribute('aria-checked', String(segment === event.currentTarget));
          pick(o.value);
        },
      }, o.label),
    ),
  );
  return el;
}

/** A titled card with an explanation and its controls. */
function panel(title, text, ...controls) {
  return h('section', { class: 'settings__section' }, h('h2', { class: 'settings__heading t-label-l' }, title), h('div', { class: 'settings__group dev__panel' }, text ? h('p', { class: 'dev__text t-body-m' }, text) : null, ...controls));
}

/** Month names in the app's language: 'long' or 'short', month 1–12. */
function monthName(lang, month, width) {
  return new Intl.DateTimeFormat(lang, { month: width, timeZone: 'UTC' }).format(Date.UTC(2026, month - 1, 15));
}

export async function devScreen(ctx, part) {
  if (part === 'pool') return { element: page(ctx, ctx.i18n.t('dev.pool'), ctx.i18n.t('dev.poolText'), await poolList(ctx)) };

  const { engine, i18n, router } = ctx;
  const t = i18n.t;
  const lang = i18n.lang;

  // Time shift: only while nothing is going on.
  const agedNote = h('p', { class: 'dev__status t-label-l', role: 'status' });
  const ageButtons = h(
    'div',
    { class: 'dev__actions' },
    AGES.map((age) =>
      button(t(age.key), async () => {
        agedNote.textContent = (await engine.age(age.ms)) ? t(age.done) : t('dev.busy');
      }, { variant: 'tonal' }),
    ),
  );

  // The season month.
  const monthNote = h('p', { class: 'dev__status t-label-l' });
  const showMonth = () => {
    const month = devPref('month') ?? new Date().getMonth() + 1;
    monthNote.textContent = t(devPref('month') === null ? 'dev.monthReal' : 'dev.monthChosen', { month: monthName(lang, month, 'long') });
  };
  const months = segments(
    t('dev.month'),
    [{ value: null, label: t('dev.real') }, ...Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: monthName(lang, i + 1, 'short') }))],
    devPref('month'),
    (value) => {
      setDevPref('month', value);
      showMonth();
    },
    'dev__months',
  );

  // A pretend last cleaning, with the home screen's line it gives.
  const lastNote = h('p', { class: 'dev__preview t-body-l' });
  const showLast = async () => {
    const { today, sinceLastCleaning } = await engine.snapshot();
    const line = pastLine(i18n, { tasks: 0, taskTimeMs: 0 }, sinceLastCleaning);
    lastNote.textContent = line ? line.text : t('dev.lastNone');
    lastNote.dataset.today = String(today.tasks > 0);
    todayNote.hidden = today.tasks === 0;
  };
  const todayNote = h('p', { class: 'dev__text t-body-m', hidden: true }, t('dev.lastToday'));
  const lasts = segments(
    t('dev.last'),
    LAST.map((o) => ({ value: o.choice, label: t(o.key) })),
    devPref('lastDone')?.choice ?? null,
    (choice) => {
      const option = LAST.find((o) => o.choice === choice);
      setDevPref('lastDone', choice === null ? null : { choice, at: Date.now() - option.agoMs });
      showLast();
    },
    'dev__lasts',
  );

  const element = page(
    ctx,
    t('dev.title'),
    t(ctx.dev === 'flag' ? 'dev.introFlag' : 'dev.introLocal'),
    panel(t('dev.time'), t('dev.timeText'), ageButtons, agedNote),
    panel(t('dev.month'), t('dev.monthText'), months, monthNote),
    panel(
      t('dev.look'),
      null,
      segments(t('settings.language'), LANGUAGES.map((l) => ({ value: l, label: t(`language.${l}`) })), lang, async (value) => {
        ctx.settings = await engine.updateSettings({ language: value });
        location.reload();
      }),
      segments(t('settings.theme'), THEMES.map((theme) => ({ value: theme, label: t(themeKey(theme)) })), ctx.settings.theme, (value) => setTheme(ctx, value)),
    ),
    panel(t('dev.last'), t('dev.lastText'), lasts, lastNote, todayNote),
    section(t('dev.pool'), row({ iconName: 'ui_sweep', hue: GROUP_HUES.CLEANING_GEAR, title: t('dev.pool'), text: t('dev.poolText'), onClick: () => router.navigate('/settings/dev/pool') })),
  );
  showMonth();
  await showLast();
  return { element };
}

/** Every active question with its numbers: the pool first, by weight. */
async function poolList(ctx) {
  const { engine, i18n } = ctx;
  const t = i18n.t;
  const [{ household }, items] = await Promise.all([engine.snapshot(), engine.poolPreview()]);
  const home = household.home;
  const one = new Intl.NumberFormat(i18n.lang, { maximumFractionDigits: 1 });
  const two = new Intl.NumberFormat(i18n.lang, { maximumFractionDigits: 2 });

  const entry = (item) => {
    const area = keyArea(item.key);
    const days = Math.round(item.interval * 10) / 10;
    const numbers = t('dev.numbers', {
      interval: t('dev.interval', { count: days, days: one.format(days) }),
      overdue: two.format(item.overdue),
      weight: one.format(item.weight),
      minutes: one.format(item.minutes),
    });
    return paintArea(
      h(
        'div',
        { class: 'pool-row area', 'data-key': item.key, 'data-pool': String(item.inPool) },
        iconBlob(areaIcon(area, home), { size: '2.5rem', animated: false }),
        h('span', { class: 'pool-row__text' }, h('span', { class: 'pool-row__area t-label-m' }, i18n.areaName(area, home)), h('span', { class: 't-body-m' }, i18n.questionText(item.key)), h('span', { class: 'pool-row__numbers t-label-m' }, numbers)),
      ),
      areaHue(area, home),
    );
  };

  const box = h('div', { class: 'pool' });
  const inPool = items.filter((i) => i.inPool);
  const rest = items.filter((i) => !i.inPool);
  const group = (title, list) => h('section', { class: 'settings__section' }, h('h2', { class: 'settings__heading t-label-l' }, title), h('div', { class: 'settings__group' }, list.map(entry)));
  replaceChildren(
    box,
    items.length === 0 ? h('p', { class: 'settings__group off__empty t-body-l' }, t('dev.poolEmpty')) : null,
    inPool.length ? group(t('dev.inPool', { count: inPool.length }), inPool) : null,
    rest.length ? group(t('dev.outOfPool', { count: rest.length }), rest) : null,
  );
  return box;
}
