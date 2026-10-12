// The Sweep screen (specification 6): question cards with gestures and
// buttons, progress, undo, the walk card before each area, and the summary.

import { currentCard, isComplete } from '../../core/sweep.js';
import { GROUP_HUES, areaHue, paintArea } from '../areas.js';
import { ANSWERS, ANSWER_BY_DIRECTION, answerButtons, button, iconButton, moveCard, questionCard, softProgress } from '../components.js';
import { createDeck } from '../deck.js';
import { h, replaceChildren } from '../dom.js';
import { SETUP_PATHS, afterFirstSweep } from './setup.js';
import { summaryContent } from './summary.js';

const SWEEP_ANSWERS = ['NO', 'NOT_APPLICABLE', 'YES'];
const LEAN = { yes: '--yes-container', no: '--no-container', na: '--not-applicable-container' };

/**
 * @param {object} ctx app context: engine, scheduler, i18n, router, haptics
 * @param {{ kind: 'first' } | { kind: 'resume' } | { kind: 'home' } | { kind: 'area', area: string }} scope
 */
export async function sweepScreen(ctx, scope) {
  const { engine, scheduler, i18n, router } = ctx;
  const t = i18n.t;

  const snapshot = await engine.snapshot();
  let home = snapshot.household.home;
  let sweep =
    scope.kind === 'first'
      ? await engine.startFirstSweep()
      : scope.kind === 'area'
        ? await engine.startOnDemandSweep(scope.area)
        : (snapshot.sweep ?? (await engine.startOnDemandSweep(null)));

  // Areas whose walk card was passed in this Sweep: it does not come back after undo (4.5).
  const arrived = new Set();
  let moving = false;
  let busy = false;
  let finished = false;

  const lean = h('div', { class: 'screen__lean' });
  const element = h('div', { class: 'screen area' }, lean);
  const progress = softProgress(0);
  const sub = h('p', { class: 'topbar__sub t-label-l' });
  const undoButton = iconButton('ui_undo', t('sweep.undo'), () => undo());
  const closeButton = iconButton('ui_close', t('sweep.close'), () => close());
  const topbar = h('header', { class: 'topbar' }, undoButton, h('div', { class: 'topbar__title' }, h('h1', { class: 't-title-m' }, t('sweep.title')), sub), closeButton);

  const deck = createDeck({
    onSwipe: (direction) => (moving ? arrive() : answer(ANSWER_BY_DIRECTION[direction])),
    onProgress: (p) => {
      buttons.setEmphasis(p);
      const [direction, amount] = Object.entries(p).sort((a, b) => b[1] - a[1])[0];
      const tone = moving || amount === 0 ? null : ANSWERS[ANSWER_BY_DIRECTION[direction]]?.tone;
      lean.style.setProperty('--lean', tone ? `var(${LEAN[tone]})` : 'transparent');
      lean.style.setProperty('--lean-amount', tone ? 0.6 * amount : 0);
    },
    onThreshold: ctx.haptics,
  });
  const buttons = answerButtons(SWEEP_ANSWERS, i18n, (given) => deck.flyOut(ANSWERS[given].direction).then((gone) => gone && answer(given)));
  const hint = h('p', { class: 'hint t-label-m' }, t('sweep.hint'));
  const answersBox = h('div', { class: 'controls__answers' }, buttons.element, hint);
  const next = button(t('move.next'), () => deck.flyOut('up').then((gone) => gone && arrive()), { variant: 'area', className: 'controls__next' });
  const controls = h('div', { class: 'controls' }, answersBox, next);

  function setBusy(value) {
    busy = value;
    deck.setEnabled(!value);
    buttons.setEnabled(!value);
    undoButton.disabled = value || sweep.steps.length === 0;
    closeButton.disabled = value;
  }

  /** Shows the current card: the walk card first when a new area starts. */
  function showCard(enterFrom = null) {
    const card = currentCard(sweep);
    const area = card.key.slice(card.key.indexOf('@') + 1);
    moving = card.position === 1 && !arrived.has(area);
    paintArea(element, areaHue(area, home));
    element.classList.toggle('screen--moving', moving);
    // Where the Sweep is, for tests and debugging: answers so far, walk card or question.
    element.dataset.step = String(sweep.steps.length);
    element.dataset.moving = String(moving);
    answersBox.classList.toggle('is-hidden', moving);
    next.classList.toggle('is-hidden', !moving);
    hint.classList.toggle('is-faded', sweep.steps.length > 0);
    sub.textContent = t('sweep.progress', { area: i18n.areaName(area, home), position: card.position, total: card.areaTotal });
    progress.set(sweep.keys.length ? sweep.steps.length / sweep.keys.length : 0);
    undoButton.disabled = sweep.steps.length === 0;
    const behind = Math.min(2, sweep.keys.length - sweep.steps.length - (moving ? 0 : 1));
    if (moving) {
      deck.show({ content: moveCard(area, home, t('move.questions', { count: card.areaTotal }), i18n), directions: ['right', 'left', 'up', 'down'], fill: true, behind });
    } else {
      const stamps = Object.fromEntries(SWEEP_ANSWERS.map((a) => [ANSWERS[a].direction, { text: t(ANSWERS[a].label), tone: ANSWERS[a].tone }]));
      const minutes = scheduler.minutes(sweep.start, card.key);
      deck.show({ content: questionCard(card.key, home, minutes, i18n), directions: SWEEP_ANSWERS.map((a) => ANSWERS[a].direction), stamps, behind, enterFrom });
    }
  }

  async function act(work) {
    if (busy || finished) return;
    setBusy(true);
    try {
      await work();
    } finally {
      setBusy(false);
    }
  }

  const answer = (given) =>
    act(async () => {
      sweep = await engine.answerSweep(given);
      if (isComplete(sweep)) await finish(false);
      else showCard();
    });

  /** "Next" on the walk card: the area's first question rises from the stack. */
  function arrive() {
    if (busy || !moving) return;
    const card = currentCard(sweep);
    arrived.add(card.key.slice(card.key.indexOf('@') + 1));
    showCard();
  }

  const undo = () =>
    act(async () => {
      const last = sweep.steps.at(-1);
      if (!last) return;
      sweep = await engine.undoSweep();
      showCard(ANSWERS[last.answer].direction);
    });

  /**
   * X, and Back (9.5): the first Sweep pauses and can be continued later; an on-demand one ends with what was
   * answered (the summary), or simply ends when nothing was answered. Resolves true when the screen stays.
   */
  async function stop() {
    if (finished) return false;
    if (sweep.scope.kind === 'first') {
      finished = true;
      return false;
    }
    if (sweep.steps.length === 0) {
      finished = true;
      await engine.finishSweep();
      return false;
    }
    await finish(false);
    return true;
  }

  /** During the setup the first Sweep belongs to it: X goes back a step, the end leads on (10). */
  const inSetup = () => sweep.scope.kind === 'first' && ctx.settings.onboarding !== 'done';

  async function close() {
    if (busy) return;
    if (await stop()) return;
    router.navigate(inSetup() ? '/setup/features' : '/', { replace: true });
  }

  /** Ends the Sweep and shows what to start with (6.4); in the setup the home screen prompt comes first. */
  async function finish(nothingDue) {
    finished = true;
    const summary = await engine.finishSweep();
    if (inSetup()) {
      const next = afterFirstSweep();
      ctx.settings = await engine.updateSettings({ onboarding: next, firstSummary: summary });
      router.navigate(SETUP_PATHS[next], { replace: true });
      return;
    }
    const goHome = () => router.navigate('/', { replace: true });
    replaceChildren(
      element,
      summaryContent(ctx, sweep.start, summary, nothingDue, {
        onStart: async () => {
          await engine.send({ kind: 'take', key: summary.toStart[0] });
          goHome();
        },
        onDone: goHome,
      }),
    );
    // The summary glows in the color of cleaning, like in Cleanerr, not in the last room's.
    paintArea(element, GROUP_HUES.CLEANING_GEAR);
    element.classList.remove('screen--moving');
    element.classList.add('screen--summary');
  }

  if (!sweep) {
    // A series or a task is going on: no Sweep now.
    queueMicrotask(() => router.navigate('/', { replace: true }));
    return { element };
  }

  replaceChildren(element, lean, topbar, progress.element, h('div', { class: 'stage' }, deck.element), controls);
  if (isComplete(sweep)) await finish(sweep.steps.length === 0);
  else requestAnimationFrame(() => showCard());

  // Another tab changed things: follow the stored Sweep, or leave when it was finished there.
  const stopListening = engine.onChange(async (change) => {
    if (!change.fromOtherTab || finished || busy) return;
    const latest = await engine.snapshot();
    home = latest.household.home;
    if (!latest.sweep) {
      finished = true;
      router.navigate('/', { replace: true });
    } else if (latest.sweep.steps.length !== sweep.steps.length) {
      sweep = latest.sweep;
      showCard();
    }
  });

  return {
    element,
    leave: async () => {
      // A finished Sweep may always go (the setup leads on from it while the last answer is still being saved).
      if (finished) return false;
      if (busy) return true;
      return stop();
    },
    destroy: stopListening,
  };
}
