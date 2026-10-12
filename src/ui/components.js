// Small building blocks of the screens: pills, progress, buttons, answer
// buttons, the question card and the card for walking over to a room (4.5).

import { areaHue, areaIcon, areaSeed, paintArea } from './areas.js';
import { iconBlob } from './blob.js';
import { h } from './dom.js';
import { icon } from './icons.js';

/** A small rounded label, optionally with an icon. `tone` picks colors from CSS (area, neutral, glass). */
export function pill(text, { iconName = null, tone = 'neutral' } = {}) {
  return h('span', { class: `pill pill--${tone}` }, iconName ? icon(iconName, { className: 'pill__icon' }) : null, h('span', {}, text));
}

/** A rounded progress bar; `set(fraction)` moves it. */
export function softProgress(fraction = 0) {
  const bar = h('div', { class: 'progress__bar' });
  const element = h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100 }, bar);
  const set = (value) => {
    const clamped = Math.min(Math.max(value, 0), 1);
    bar.style.transform = `scaleX(${clamped})`;
    element.setAttribute('aria-valuenow', Math.round(clamped * 100));
  };
  set(fraction);
  return { element, set };
}

/** A big filled button (`variant` filled / tonal / text), full width by default. */
export function button(label, onClick, { variant = 'filled', iconName = null, className = '' } = {}) {
  return h('button', { type: 'button', class: `button button--${variant} ${className}`.trim(), onclick: onClick }, iconName ? icon(iconName) : null, h('span', {}, label));
}

/** A round icon button with an accessible label. */
export function iconButton(iconName, label, onClick, { className = '' } = {}) {
  return h('button', { type: 'button', class: `icon-button ${className}`.trim(), 'aria-label': label, title: label, onclick: onClick }, icon(iconName));
}

/** Answers and how they look: direction of the gesture, tone, icon, size, label key. */
export const ANSWERS = {
  YES: { direction: 'right', tone: 'yes', icon: 'ui_check', size: 'large', label: 'answer.yes' },
  NO: { direction: 'left', tone: 'no', icon: 'ui_broom', size: 'large', label: 'answer.no' },
  NOT_APPLICABLE: { direction: 'up', tone: 'na', icon: 'ui_not_applicable', size: 'small', label: 'answer.na' },
  NOT_NOW: { direction: 'down', tone: 'later', icon: 'ui_hourglass', size: 'small', label: 'answer.notNow' },
};

export const ANSWER_BY_DIRECTION = Object.fromEntries(Object.entries(ANSWERS).map(([answer, spec]) => [spec.direction, answer]));

/**
 * The round answer buttons under a card. In a series NO, NOT NOW, N/A, YES; in a Sweep NO, N/A, YES.
 * `setEmphasis(progress)` grows and fills the button the card is dragged towards, so gesture and buttons feel
 * like one control.
 */
export function answerButtons(answers, i18n, onAnswer) {
  const buttons = {};
  const element = h(
    'div',
    { class: 'answers' },
    answers.map((answer) => {
      const spec = ANSWERS[answer];
      const label = i18n.t(spec.label);
      const el = h(
        'button',
        { type: 'button', class: `answer answer--${spec.size} tone-${spec.tone}`, dataset: { answer }, onclick: () => onAnswer(answer) },
        h('span', { class: 'answer__circle' }, icon(spec.icon, { className: 'answer__icon' })),
        h('span', { class: 'answer__label' }, label),
      );
      buttons[spec.direction] = el;
      return el;
    }),
  );
  return {
    element,
    setEmphasis(progress) {
      for (const [direction, el] of Object.entries(buttons)) el.style.setProperty('--emphasis', progress[direction] ?? 0);
    },
    setEnabled(enabled) {
      for (const el of Object.values(buttons)) el.disabled = !enabled;
    },
  };
}

/** Area and time chips on top of a question or task card. */
export function cardChips(key, home, minutes, i18n) {
  const area = key.slice(key.indexOf('@') + 1);
  return h(
    'div',
    { class: 'card-chips' },
    paintArea(pill(i18n.areaName(area, home), { iconName: areaIcon(area, home), tone: 'area' }), areaHue(area, home)),
    pill(i18n.t('card.minutes', { minutes: Math.max(1, Math.round(minutes)) }), { iconName: 'ui_clock' }),
  );
}

/**
 * A question card's content: chips and the big question in the middle. No big icon: the room's icon would not
 * match a question about e.g. the floor (6.1).
 */
export function questionCard(key, home, minutes, i18n, { text = i18n.questionText(key), label = null } = {}) {
  return h(
    'div',
    { class: 'question-card' },
    cardChips(key, home, minutes, i18n),
    h('div', { class: 'question-card__body' }, label ? h('p', { class: 'question-card__label t-title-m' }, label) : null, h('p', { class: 'question-card__text t-headline-s' }, text)),
  );
}

/**
 * The card for walking over to another room or group (4.5): "Head to", the area's icon on a white blob, its
 * name and how much waits there. Filled with the area's color; the deck gets `fill: true`.
 */
export function moveCard(area, home, detail, i18n) {
  return h(
    'div',
    { class: 'move-card' },
    h('p', { class: 'move-card__head t-title-m' }, i18n.t('move.to')),
    iconBlob(areaIcon(area, home), { size: 'min(10.5rem, 32vh)', seed: areaSeed(area), className: 'blob--white move-card__blob' }),
    h('p', { class: 'move-card__name t-display-s' }, i18n.areaName(area, home)),
    detail ? pill(detail, { tone: 'glass' }) : null,
  );
}
