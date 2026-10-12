// Development gallery: the building blocks of Cleaneh, and the card deck to try.
//   gallery.html                  palette, type, area colors, icons, pills, buttons
//   gallery.html?view=series      a series of questions with the walk card
//   gallery.html?view=sweep       a Sweep with undo and progress
//   gallery.html?view=move        one walk card
// Add &lang=pl for Polish, &theme=dark or &theme=light to override the system theme.

import { addRoom, areas, emptyHome, withFeature } from '../src/core/home.js';
import { DEFAULT_CATALOG } from '../src/core/catalog.js';
import { GROUP_HUES, ROOM_HUES, areaHue, areaIcon, paintArea } from '../src/ui/areas.js';
import { iconBlob } from '../src/ui/blob.js';
import { ANSWERS, ANSWER_BY_DIRECTION, answerButtons, button, iconButton, moveCard, pill, questionCard, softProgress } from '../src/ui/components.js';
import { createDeck } from '../src/ui/deck.js';
import { h, replaceChildren } from '../src/ui/dom.js';
import { createI18n, detectLanguage } from '../src/ui/i18n/index.js';
import { icon, loadIcons } from '../src/ui/icons.js';

const params = new URLSearchParams(location.search);
const i18n = createI18n(params.get('lang') ?? detectLanguage());
document.documentElement.lang = i18n.lang;
if (params.get('theme')) document.documentElement.dataset.theme = params.get('theme');
const root = document.getElementById('gallery');

/** A sample home: entryway, kitchen, bathroom, two bedrooms, a living room; laundry and pets. */
let home = emptyHome();
for (const kind of ['ENTRYWAY', 'KITCHEN', 'BATHROOM', 'BEDROOM', 'BEDROOM', 'LIVING_ROOM', 'ROOM']) home = addRoom(home, kind);
for (const feature of ['LAUNDRY', 'WASHING_MACHINE', 'PET', 'CAT', 'CHILD', 'CAR', 'AIR', 'ELECTRONICS', 'CLEANING_GEAR']) home = withFeature(home, feature, true);
const homeAreas = areas(home);

/** Sample questions: a few per area, in Sweep order. */
const sampleKeys = homeAreas.flatMap((area) => {
  const parsed = area.startsWith('room#') ? home.rooms.find((r) => `room#${r.id}` === area).kind : null;
  const questions = parsed ? DEFAULT_CATALOG.forKind(parsed) : DEFAULT_CATALOG.forGroup(area.slice(6));
  return questions.filter((q) => q.firstSweep || questions.indexOf(q) < 2).slice(0, 3).map((q) => `${q.id}@${area}`);
});

const vibrate = () => navigator.vibrate?.(10);

function link(view, label) {
  const query = new URLSearchParams(params);
  if (view) query.set('view', view);
  else query.delete('view');
  return h('a', { href: `?${query}` }, label);
}

/** Puts the sample home into the app's own data (this address), with five days passed. */
async function seedSampleHome() {
  const [{ startEngine }] = await Promise.all([import('../src/engine/start.js')]);
  const { engine } = await startEngine();
  const { household } = await engine.snapshot();
  if (household.home.rooms.length === 0) {
    await engine.updateHome(() => home);
    await engine.age(5 * 86_400_000);
    await engine.updateSettings({ onboarding: 'done' });
  }
  engine.close();
  document.getElementById('seed-note').textContent = household.home.rooms.length ? 'The app already has rooms; nothing changed.' : 'Done. Open the app and tap Sweep.';
}

function swatch(name, color) {
  return h('div', { class: 'swatch' }, h('div', { class: 'swatch__color', style: { background: `var(${color})` } }), name);
}

function overview() {
  const allIcons = [...document.querySelectorAll('symbol')].map((s) => s.id);
  return h(
    'div',
    { class: 'gallery' },
    h('h1', { class: 't-headline-m' }, 'Cleaneh gallery'),
    h('nav', {}, link(null, 'Overview'), link('series', 'Series'), link('sweep', 'Sweep'), link('move', 'Walk card')),

    h('h2', {}, 'The app'),
    h(
      'div',
      { class: 'row', style: { maxWidth: '36rem' } },
      button('Sample home in the app', seedSampleHome, { variant: 'tonal' }),
      button('Open the app', () => (location.href = '../'), { variant: 'text' }),
    ),
    h('p', { class: 't-body-m', id: 'seed-note' }, 'Skips the setup: adds the sample home below to the app on this address, with a few days passed, so a Sweep has something to ask.'),

    h('h2', {}, 'Palette'),
    h('div', { class: 'row' }, [
      swatch('primary', '--primary'),
      swatch('container', '--primary-container'),
      swatch('background', '--background'),
      swatch('card', '--card'),
      swatch('YES', '--yes'),
      swatch('NO', '--no'),
      swatch('N/A', '--not-applicable'),
      swatch('NOT NOW', '--not-now'),
      swatch('lavender', '--lavender-button'),
    ]),

    h('h2', {}, 'Type'),
    h(
      'div',
      { class: 'type-sample' },
      ['t-display-s', 't-headline-m', 't-headline-s', 't-title-l', 't-title-m', 't-body-l', 't-body-m', 't-label-l', 't-label-m'].map((cls) =>
        h('p', { class: cls }, `${cls.slice(2)} · ${i18n.questionText('kitchen_counter_clean')} Zażółć gęślą jaźń`),
      ),
    ),

    h('h2', {}, 'Room colors (in the order new rooms get them)'),
    h(
      'div',
      { class: 'fills' },
      ROOM_HUES.map((hue, index) =>
        paintArea(
          h('div', { class: 'fill area' }, iconBlob('area_room', { size: '4rem', seed: index, className: 'blob--white' }), `${index + 1}. ${hue.name}`, h('div', { class: 'fill__tones' }, h('span', { style: { background: 'var(--area)' } }), h('span', { style: { background: 'var(--area-container)' } }))),
          hue,
        ),
      ),
    ),

    h('h2', {}, 'Groups'),
    h(
      'div',
      { class: 'fills' },
      Object.entries(GROUP_HUES).map(([group, hue]) =>
        paintArea(h('div', { class: 'fill area' }, iconBlob(areaIcon(`group#${group}`, home), { size: '4rem', seed: 100, className: 'blob--white' }), i18n.groupName(group)), hue),
      ),
    ),

    h('h2', {}, 'Pills and buttons'),
    h(
      'div',
      { class: 'row' },
      homeAreas.slice(0, 4).map((area) => paintArea(pill(i18n.areaName(area, home), { iconName: areaIcon(area, home), tone: 'area' }), areaHue(area, home))),
      pill(i18n.t('card.minutes', { minutes: 5 }), { iconName: 'ui_clock' }),
    ),
    h('div', { class: 'row', style: { marginTop: '0.75rem', maxWidth: '24rem' } }, button(i18n.t('answer.done'), () => {}, { iconName: 'ui_check' }), button(i18n.t('move.next'), () => {}, { variant: 'tonal' })),
    h('div', { class: 'row', style: { marginTop: '0.75rem' } }, answerButtons(['NO', 'NOT_NOW', 'NOT_APPLICABLE', 'YES'], i18n, () => {}).element),

    h('h2', {}, `Icons (${allIcons.length})`),
    h(
      'div',
      { class: 'icons' },
      allIcons.map((name, index) =>
        paintArea(h('div', { class: 'icon-cell area' }, iconBlob(name, { size: '3.5rem', seed: index, animated: false }), icon(name), name), ROOM_HUES[index % ROOM_HUES.length]),
      ),
    ),
  );
}

/**
 * A playground of a series (NOT NOW too) or a Sweep: the deck with answer buttons, the walk card when the area
 * changes, the screen leaning towards the answer while dragging.
 */
function playground(mode) {
  const series = mode === 'series';
  const answers = series ? ['NO', 'NOT_NOW', 'NOT_APPLICABLE', 'YES'] : ['NO', 'NOT_APPLICABLE', 'YES'];
  const directions = answers.map((a) => ANSWERS[a].direction);
  const stamps = Object.fromEntries(answers.map((a) => [ANSWERS[a].direction, { text: i18n.t(ANSWERS[a].label), tone: ANSWERS[a].tone }]));

  let index = 0;
  let lastArea = series ? null : undefined;
  let moving = false;
  const history = [];

  const lean = h('div', { class: 'screen__lean' });
  const screen = h('div', { class: 'screen area playground' }, lean);
  const progress = softProgress(0);
  const sub = h('p', { class: 'topbar__sub t-label-l' });
  const undo = iconButton('ui_undo', i18n.t('sweep.undo'), () => {
    if (!history.length) return;
    ({ index, lastArea } = history.pop());
    showCard({ enterFrom: 'left' });
  });
  const topbar = series
    ? h('div', { class: 'topbar' }, h('span'), h('span'), iconButton('ui_close', i18n.t('series.stop'), () => {}))
    : h('div', { class: 'topbar' }, undo, h('div', { class: 'topbar__title' }, h('p', { class: 't-title-m' }, i18n.t('sweep.title')), sub), iconButton('ui_close', i18n.t('sweep.close'), () => {}));

  const deck = createDeck({
    onSwipe: (direction) => (moving ? arrive() : answered(ANSWER_BY_DIRECTION[direction])),
    onProgress: (p) => {
      buttons.setEmphasis(p);
      const [direction, amount] = Object.entries(p).sort((a, b) => b[1] - a[1])[0];
      const tone = moving || amount === 0 ? null : ANSWERS[ANSWER_BY_DIRECTION[direction]].tone;
      lean.style.setProperty('--lean', tone ? `var(--${{ yes: 'yes', no: 'no', na: 'not-applicable', later: 'not-now' }[tone]}-container)` : 'transparent');
      lean.style.setProperty('--lean-amount', tone ? 0.6 * amount : 0);
    },
    onThreshold: vibrate,
  });
  const buttons = answerButtons(answers, i18n, (answer) => deck.flyOut(ANSWERS[answer].direction).then((gone) => gone && answered(answer)));
  const next = button(i18n.t('move.next'), () => deck.flyOut('up').then((gone) => gone && arrive()), { variant: 'area', className: 'controls__next' });
  const hint = h('p', { class: 'hint t-label-m' }, series ? '' : i18n.t('sweep.hint'));
  const controls = h('div', { class: 'controls' }, h('div', {}, buttons.element, series ? null : hint), next);

  function areaOf(key) {
    return key.slice(key.indexOf('@') + 1);
  }

  function showCard({ enterFrom = null } = {}) {
    const key = sampleKeys[index % sampleKeys.length];
    const area = areaOf(key);
    paintArea(screen, areaHue(area, home));
    const areaTotal = sampleKeys.filter((k) => areaOf(k) === area).length;
    const position = sampleKeys.slice(0, (index % sampleKeys.length) + 1).filter((k) => areaOf(k) === area).length;
    // The walk card: in a series between areas, in a Sweep also before the first; never on undo (4.5).
    moving = enterFrom === null && (series ? lastArea !== null && lastArea !== area : lastArea !== area);
    screen.classList.toggle('screen--moving', moving);
    buttons.element.parentElement.style.visibility = moving ? 'hidden' : 'visible';
    next.style.visibility = moving ? 'visible' : 'hidden';
    sub.textContent = i18n.t('sweep.progress', { area: i18n.areaName(area, home), position, total: areaTotal });
    progress.set(index / sampleKeys.length);
    undo.disabled = history.length === 0;
    const behind = Math.min(2, sampleKeys.length - index - 1);
    if (moving) {
      const detail = series ? null : i18n.t('move.questions', { count: areaTotal });
      deck.show({ content: moveCard(area, home, detail, i18n), directions: ['right', 'left', 'up', 'down'], fill: true, behind });
    } else {
      deck.show({ content: questionCard(key, home, DEFAULT_CATALOG.get(key.split('@')[0]).minutes, i18n), directions, stamps, behind, enterFrom });
    }
  }

  function arrive() {
    moving = false;
    lastArea = areaOf(sampleKeys[index % sampleKeys.length]);
    showCard();
  }

  function answered() {
    history.push({ index, lastArea });
    lastArea = areaOf(sampleKeys[index % sampleKeys.length]);
    index += 1;
    showCard();
  }

  replaceChildren(screen, lean, topbar, series ? null : progress.element, h('div', { class: 'stage' }, deck.element), controls);
  requestAnimationFrame(() => showCard());
  return screen;
}

/** One walk card, still. */
function moveView() {
  const area = homeAreas[3];
  const deck = createDeck({ onSwipe: () => {} });
  const screen = paintArea(h('div', { class: 'screen screen--moving area playground' }, h('div', { class: 'topbar' }), h('div', { class: 'stage' }, deck.element), h('div', { class: 'controls' }, button(i18n.t('move.next'), () => {}, { variant: 'area', className: 'controls__next' }))), areaHue(area, home));
  requestAnimationFrame(() => deck.show({ content: moveCard(area, home, i18n.t('move.questions', { count: 12 }), i18n), directions: ['right', 'left', 'up', 'down'], fill: true }));
  return screen;
}

await loadIcons();
const view = params.get('view');
replaceChildren(root, view === 'series' || view === 'sweep' ? playground(view) : view === 'move' ? moveView() : overview());
document.body.dataset.ready = 'true';
