// The home screen (specification 5): whatever the main loop is doing — the
// calm home with "Give me a task", a question of a series, the "Do it now?"
// offer, or the stopwatch — and the reward after DONE.

import { areas } from '../../core/home.js';
import { movesTo } from '../../core/loop.js';
import { keyArea } from '../../core/scheduler.js';
import { startedMinutes } from '../../core/time.js';
import { areaHue, areaIcon, paintArea } from '../areas.js';
import { iconBlob } from '../blob.js';
import { ANSWERS, ANSWER_BY_DIRECTION, answerButtons, button, iconButton, moveCard, pill, questionCard } from '../components.js';
import { createDeck } from '../deck.js';
import { choose } from '../dialog.js';
import { h } from '../dom.js';
import { showReward } from '../reward.js';
import { openSheet } from '../sheet.js';
import { unlockSound } from '../sound.js';

/** Area for an address: 'room#3' <-> 'room:3' ('#' cannot be part of the address after '#'). */
export const areaToPath = (area) => area.replace('#', ':');
export const pathToArea = (part) => part.replace(':', '#');

const SERIES_ANSWERS = ['NO', 'NOT_NOW', 'NOT_APPLICABLE', 'YES'];
const LEAN = { yes: '--yes-container', no: '--no-container', na: '--not-applicable-container', later: '--not-now-container' };

/** "4:07", or "1:02:15" after an hour (4.2). */
export function stopwatchText(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const two = (n) => String(n).padStart(2, '0');
  return s < 3600 ? `${Math.floor(s / 60)}:${two(s % 60)}` : `${Math.floor(s / 3600)}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}`;
}

/** Today's result, or the last cleaning when nothing was done today (5.1); null before the first DONE. */
export function pastLine(i18n, today, since) {
  const t = i18n.t;
  if (today.tasks > 0) return { text: t('home.today', { count: today.tasks, minutes: startedMinutes(today.taskTimeMs) }), iconName: 'ui_check' };
  switch (since.kind) {
    case 'just-now':
      return { text: t('last.justNow'), iconName: 'ui_clock' };
    case 'hours':
      return { text: t('last.hours', { hours: t('unit.hours', { count: since.hours }) }), iconName: 'ui_clock' };
    case 'days':
      return {
        text: since.hours === 0 ? t('last.days', { days: t('unit.days', { count: since.days }) }) : t('last.daysHours', { days: t('unit.days', { count: since.days }), hours: t('unit.hours', { count: since.hours }) }),
        iconName: 'ui_clock',
      };
    case 'long':
      return { text: t('last.long'), iconName: null, plain: true };
    default:
      return null;
  }
}

export async function homeScreen(ctx) {
  const { engine, scheduler, i18n, router } = ctx;
  const t = i18n.t;
  const element = h('div', { class: 'home-root' });

  // What the screen remembers between steps: the series that just ended, "nothing due", the walk card passed.
  const local = { ended: null, nothingDue: false, arrivedFor: null, busy: false };
  let view = null;

  async function refresh() {
    const snapshot = await engine.snapshot();
    view?.destroy?.();
    const { activity } = snapshot;
    view =
      activity.kind === 'asking'
        ? questionView(snapshot)
        : activity.kind === 'offering'
          ? offerView(snapshot)
          : activity.kind === 'timing'
            ? timingView(snapshot)
            : idleView(snapshot);
    element.replaceChildren(view.element);
    element.dataset.mode = activity.kind;
  }

  /** Sends a loop event, then shows the result; a DONE gets its reward over the next question. */
  async function send(event) {
    if (local.busy) return null;
    local.busy = true;
    element.dataset.busy = 'true';
    try {
      if (event.kind === 'request-task') local.ended = null;
      local.nothingDue = false;
      const step = await engine.send(event);
      if (step.ended && !step.ended.abandoned) local.ended = step.ended;
      local.nothingDue = step.nothingDue;
      await refresh();
      const done = step.log.find((entry) => entry.kind === 'DONE');
      if (done) rewardFor(done);
      return step;
    } finally {
      local.busy = false;
      delete element.dataset.busy;
    }
  }

  async function rewardFor(done) {
    const { today } = await engine.snapshot();
    const praises = t('reward.praise').split('|');
    const seed = Date.now() % 100000;
    const choice = await showReward({
      title: praises[seed % praises.length],
      subtitle: i18n.taskText(done.key),
      pills: [
        { text: stopwatchText(done.taskTimeMs / 1000), iconName: 'ui_clock' },
        { text: t('home.today', { count: today.tasks, minutes: startedMinutes(today.taskTimeMs) }), iconName: 'ui_sparkles' },
      ],
      badge: 'ui_check',
      nextLabel: t('reward.next'),
      enoughLabel: t('reward.enough'),
      seed,
      sound: ctx.settings.sound,
    });
    if (choice === 'enough') {
      const { activity } = await engine.snapshot();
      if (activity.kind === 'asking' || activity.kind === 'offering') await send({ kind: 'stop' });
    }
  }

  // --- nothing going on ---

  function idleView({ sweep, today, sinceLastCleaning }) {
    const ended = local.ended;
    const [title, text] =
      ended?.poolEmpty
        ? ['home.allDoneTitle', 'home.endOfDay']
        : local.nothingDue
          ? ['home.allDoneTitle', 'home.allDoneText']
          : ended && ended.tasksDone > 0
            ? ['home.seriesDone', 'home.quietText']
            : ['home.quietTitle', 'home.quietText'];
    const past = pastLine(i18n, today, sinceLastCleaning);
    const suggestSweep = local.nothingDue || ended?.poolEmpty;

    const sweepButton = sweep
      ? button(t(sweep.scope.kind === 'first' ? 'home.continueFirstSweep' : 'home.continueSweep'), () => router.navigate(sweep.scope.kind === 'first' ? '/sweep/first' : '/sweep'), { iconName: 'ui_sweep', variant: 'filled' })
      : button(t('home.sweep'), () => chooseScope(ctx), { iconName: 'ui_sweep', variant: suggestSweep ? 'filled' : 'outlined' });

    return {
      element: h(
        'div',
        { class: 'screen home' },
        h('header', { class: 'home__bar' }, h('img', { class: 'home__logo', src: 'assets/icons/app.svg', alt: '' }), h('span', { class: 'home__name t-title-l' }, t('app.name'))),
        h(
          'div',
          { class: 'home__hero' },
          iconBlob('ui_sparkles', { size: 'min(11.5rem, 24vh)', className: 'blob--primary home__blob' }),
          h('h1', { class: 'home__title t-headline-m' }, t(title)),
          h('p', { class: 'home__text t-body-l' }, t(text)),
          past ? (past.plain ? h('p', { class: 'home__past t-body-m' }, past.text) : pill(past.text, { iconName: past.iconName })) : null,
        ),
        h(
          'div',
          { class: 'home__actions' },
          button(t('home.giveTask'), () => send({ kind: 'request-task' }), { iconName: 'ui_sparkles', className: 'home__give' }),
          sweepButton,
        ),
      ),
    };
  }

  // --- a question of a series ---

  function seriesBar(key, number, home, onStop) {
    return h(
      'header',
      { class: 'topbar' },
      h('span'),
      h('div', { class: 'topbar__title' }, h('h1', { class: 't-title-m' }, t('series.question', { number })), h('p', { class: 'topbar__sub t-label-l' }, i18n.areaName(keyArea(key), home))),
      iconButton('ui_close', t('series.stop'), onStop),
    );
  }

  function questionView(snapshot) {
    const { key, series } = snapshot.activity;
    const home = snapshot.household.home;
    const area = keyArea(key);
    const identity = `${key}|${series.startedAt}|${series.answered}`;
    let moving = movesTo(series, area) && local.arrivedFor !== identity;

    const lean = h('div', { class: 'screen__lean' });
    const element = paintArea(h('div', { class: 'screen area', dataset: { moving: String(moving) } }, lean), areaHue(area, home));
    const deck = createDeck({
      onSwipe: (direction) => (moving ? arrive() : answered(ANSWER_BY_DIRECTION[direction])),
      onProgress: (p) => {
        buttons.setEmphasis(p);
        const [direction, amount] = Object.entries(p).sort((a, b) => b[1] - a[1])[0];
        const tone = moving || amount === 0 ? null : ANSWERS[ANSWER_BY_DIRECTION[direction]].tone;
        lean.style.setProperty('--lean', tone ? `var(${LEAN[tone]})` : 'transparent');
        lean.style.setProperty('--lean-amount', tone ? 0.6 * amount : 0);
      },
      onThreshold: ctx.haptics,
    });
    const buttons = answerButtons(SERIES_ANSWERS, i18n, (given) => deck.flyOut(ANSWERS[given].direction).then((gone) => gone && answered(given)));
    const answersBox = h('div', { class: 'controls__answers' }, buttons.element);
    const next = button(t('move.next'), () => deck.flyOut('up').then((gone) => gone && arrive()), { variant: 'area', className: 'controls__next' });

    function show(enterFrom = null) {
      element.classList.toggle('screen--moving', moving);
      element.dataset.moving = String(moving);
      answersBox.classList.toggle('is-hidden', moving);
      next.classList.toggle('is-hidden', !moving);
      if (moving) {
        deck.show({ content: moveCard(area, home, null, i18n), directions: ['right', 'left', 'up', 'down'], fill: true, behind: 2 });
      } else {
        const stamps = Object.fromEntries(SERIES_ANSWERS.map((a) => [ANSWERS[a].direction, { text: t(ANSWERS[a].label), tone: ANSWERS[a].tone }]));
        deck.show({ content: questionCard(key, home, scheduler.minutes(snapshot.household, key), i18n), directions: SERIES_ANSWERS.map((a) => ANSWERS[a].direction), stamps, behind: 2, enterFrom });
      }
    }

    function arrive() {
      local.arrivedFor = identity;
      moving = false;
      show();
    }

    async function answered(given) {
      if (given === 'NOT_APPLICABLE') {
        // N/A turns the question off for good, so it asks first (5); "Keep it" brings the card back from the top.
        const choice = await choose({
          art: paintArea(h('div', { class: 'area' }, iconBlob(areaIcon(area, home), { size: '4rem', animated: false })), areaHue(area, home)),
          title: t('na.title'),
          body: [h('p', { class: 'dialog__question t-title-m' }, t('na.question', { question: i18n.questionText(key) })), h('p', { class: 't-body-m' }, t('na.text'))],
          safeLabel: t('na.keep'),
          otherLabel: t('na.turnOff'),
          otherTone: 'tone-na',
        });
        if (choice === 'safe') return show('up');
      }
      send({ kind: 'answer', key, answer: given });
    }

    element.append(
      seriesBar(key, series.answered + 1, home, () => send({ kind: 'stop' })),
      h('div', { class: 'stage' }, deck.element),
      h('div', { class: 'controls' }, answersBox, next),
    );
    requestAnimationFrame(() => show());
    return { element };
  }

  // --- "Do it now?" ---

  function offerView(snapshot) {
    const { key, series } = snapshot.activity;
    const home = snapshot.household.home;
    const area = keyArea(key);
    const element = paintArea(
      h(
        'div',
        { class: 'screen area offer' },
        seriesBar(key, series.answered, home, () => send({ kind: 'stop' })),
        h('div', { class: 'stage' }, h('div', { class: 'card card--static' }, h('div', { class: 'card__content' }, questionCard(key, home, scheduler.minutes(snapshot.household, key), i18n, { text: i18n.taskText(key), label: t('offer.title') })))),
        h(
          'div',
          { class: 'offer__actions' },
          button(t('offer.start'), () => send({ kind: 'start', key }), { iconName: 'ui_play' }),
          button(t('offer.notNow'), () => send({ kind: 'skip', key }), { variant: 'text' }),
        ),
      ),
      areaHue(area, home),
    );
    return { element };
  }

  // --- the stopwatch ---

  function timingView(snapshot) {
    const { key, startedAt } = snapshot.activity;
    const home = snapshot.household.home;
    const area = keyArea(key);
    const clock = h('p', { class: 'stopwatch__clock', role: 'timer' });
    let timer = null;
    const tick = () => {
      const elapsed = Math.max(0, Date.now() - startedAt);
      clock.textContent = stopwatchText(elapsed / 1000);
      // On the next whole second since the start.
      timer = setTimeout(tick, 1000 - (elapsed % 1000));
    };
    tick();
    const element = paintArea(
      h(
        'div',
        { class: 'screen area stopwatch' },
        h('div', { class: 'stopwatch__top' }, paintArea(pill(i18n.areaName(area, home), { iconName: areaIcon(area, home), tone: 'area' }), areaHue(area, home))),
        h('h1', { class: 'stopwatch__task t-headline-m' }, i18n.taskText(key)),
        clock,
        h(
          'div',
          { class: 'stopwatch__actions' },
          button(
            t('timer.done'),
            () => {
              unlockSound();
              send({ kind: 'done', key });
            },
            { iconName: 'ui_check', className: 'button--yes' },
          ),
          button(t('timer.giveUp'), () => send({ kind: 'give-up', key }), { variant: 'text', className: 'stopwatch__give-up' }),
        ),
      ),
      areaHue(area, home),
    );
    return { element, destroy: () => clearTimeout(timer) };
  }

  await refresh();

  // Changes from another tab, or closing what was left behind when coming back to the app (4.3).
  const stopListening = engine.onChange(() => {
    if (!local.busy && !document.querySelector('.reward, .dialog')) refresh();
  });

  return {
    element,
    destroy() {
      stopListening();
      view?.destroy?.();
    },
  };
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
