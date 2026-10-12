// A stack of cards where the front one can be dragged off (specification 6.1, 5):
// right YES, left NO, up N/A, down NOT NOW. While dragging, the card tilts,
// shows the answer's stamp, the cards behind move up and listeners get the
// progress (answer buttons grow, the screen takes the answer's color).
// Gestures are a shortcut; the buttons under the deck do the same.

import { h, reducedMotion } from './dom.js';

/** @typedef {'right' | 'left' | 'up' | 'down'} Direction */

const COMMIT_X = 0.32;
const COMMIT_Y = 0.2;
/** A quick flick commits earlier, in CSS pixels per second. */
const FLICK = 600;
const TILT_DEG = 14;
const STACK_SCALE = 0.05;
/** Step between cards in the stack, in CSS pixels: the same with any text size. */
const STACK_STEP = 34;

/** How far (0–1) an offset is towards committing to a direction, for a card of this size. */
export function progressOf(direction, x, y, width, height) {
  let p;
  if (direction === 'right') p = x / (width * COMMIT_X);
  else if (direction === 'left') p = -x / (width * COMMIT_X);
  else if (direction === 'up') p = -y > Math.abs(x) ? -y / (height * COMMIT_Y) : 0;
  else p = y > Math.abs(x) ? y / (height * COMMIT_Y) : 0;
  return Math.min(Math.max(p, 0), 1);
}

/** The direction a drag commits to: far enough, or a quick flick (velocity in px/s). */
export function committedDirection(allowed, x, y, width, height, vx = 0, vy = 0) {
  return (
    allowed.find((direction) => {
      if (progressOf(direction, x, y, width, height) >= 1) return true;
      if (direction === 'right') return vx > FLICK && x > width * 0.08;
      if (direction === 'left') return vx < -FLICK && x < -width * 0.08;
      if (direction === 'up') return vy < -FLICK && -y > height * 0.06 && -y > Math.abs(x);
      return vy > FLICK && y > height * 0.06 && y > Math.abs(x);
    }) ?? null
  );
}

const STAMP_PLACES = {
  right: { className: 'stamp--right', rotate: -12 },
  left: { className: 'stamp--left', rotate: 12 },
  up: { className: 'stamp--up', rotate: 0 },
  down: { className: 'stamp--down', rotate: 0 },
};

/**
 * @param {object} options
 * @param {(direction: Direction) => void} options.onSwipe called after the card has flown off
 * @param {(progress: Record<Direction, number>) => void} [options.onProgress] while dragging and settling
 * @param {() => void} [options.onThreshold] when a drag crosses a commit threshold (vibration, 13.1)
 */
export function createDeck({ onSwipe, onProgress = () => {}, onThreshold = () => {} }) {
  const backs = [h('div', { class: 'card card--back' }), h('div', { class: 'card card--back' })];
  const element = h('div', { class: 'deck' }, ...backs);
  let front = null;
  let allowed = [];
  let enabled = true;
  let leaving = false;
  let behind = 2;
  let offset = { x: 0, y: 0 };
  let stamps = {};

  const size = () => ({ width: element.clientWidth || 1, height: element.clientHeight || 1 });

  function progress(x = offset.x, y = offset.y) {
    const { width, height } = size();
    return Object.fromEntries(['right', 'left', 'up', 'down'].map((d) => [d, allowed.includes(d) ? progressOf(d, x, y, width, height) : 0]));
  }

  /** Puts the front card where the offset says, with its stamps and the stack behind. */
  function render() {
    if (!front) return;
    const { width } = size();
    front.style.transform = `translate(${offset.x}px, ${offset.y}px) rotate(${(offset.x / width) * TILT_DEG}deg)`;
    const p = progress();
    for (const [direction, stamp] of Object.entries(stamps)) {
      const value = p[direction];
      stamp.style.opacity = value;
      stamp.style.transform = `rotate(${STAMP_PLACES[direction].rotate}deg) scale(${0.7 + 0.3 * value})`;
    }
    layoutBacks(Math.max(...Object.values(p)));
    onProgress(p);
  }

  function layoutBacks(lift = 0) {
    backs.forEach((back, index) => {
      const depthIndex = index + 1;
      back.hidden = depthIndex > behind;
      const depth = depthIndex - lift * 0.6;
      back.style.transform = `translateY(${depth * STACK_STEP}px) scale(${1 - STACK_SCALE * depth})`;
    });
  }

  /** Moves the front card to `target`; resolves when it is there. */
  async function animate(target, options) {
    const card = front;
    const { width } = size();
    const from = card.style.transform;
    const to = `translate(${target.x}px, ${target.y}px) rotate(${(target.x / width) * TILT_DEG}deg)`;
    offset = target;
    const duration = reducedMotion() ? options.duration / 2 : options.duration;
    const animation = card.animate([{ transform: from }, { transform: to }], { ...options, duration, fill: 'forwards' });
    await animation.finished;
    if (card === front) render();
    animation.cancel();
  }

  /** Flies the front card off towards a direction (also for the buttons). Resolves true once it is gone. */
  async function flyOut(direction) {
    if (!front || leaving || !enabled) return false;
    leaving = true;
    const { width, height } = size();
    const target = {
      right: { x: width * 1.6, y: offset.y + height * 0.06 },
      left: { x: -width * 1.6, y: offset.y + height * 0.06 },
      up: { x: offset.x, y: -height * 1.5 },
      down: { x: offset.x, y: height * 1.5 },
    }[direction];
    const settle = progress(target.x, target.y);
    onProgress(settle);
    await animate(target, { duration: 260, easing: 'cubic-bezier(0.4, 0, 1, 1)' });
    return true;
  }

  async function settle() {
    await animate({ x: 0, y: 0 }, { duration: 420, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
  }

  function attachGestures(card) {
    let start = null;
    let samples = [];
    let armed = null;
    card.addEventListener('pointerdown', (event) => {
      if (!enabled || leaving || allowed.length === 0 || event.button > 0) return;
      card.setPointerCapture(event.pointerId);
      start = { x: event.clientX - offset.x, y: event.clientY - offset.y };
      samples = [{ t: event.timeStamp, x: offset.x, y: offset.y }];
      card.classList.add('card--dragging');
    });
    card.addEventListener('pointermove', (event) => {
      if (!start) return;
      const vertical = allowed.includes('up') || allowed.includes('down');
      const x = event.clientX - start.x;
      const y = (event.clientY - start.y) * (vertical ? 1 : 0.35);
      offset = { x, y };
      samples.push({ t: event.timeStamp, x, y });
      samples = samples.filter((s) => event.timeStamp - s.t < 100);
      render();
      const { width, height } = size();
      const now = committedDirection(allowed, x, y, width, height);
      if (now !== armed) {
        if (now) onThreshold();
        armed = now;
      }
    });
    const end = (event) => {
      if (!start) return;
      start = null;
      card.classList.remove('card--dragging');
      const first = samples[0];
      const last = samples.at(-1);
      const dt = Math.max((last.t - first.t) / 1000, 0.001);
      const { width, height } = size();
      const cancelled = event.type === 'pointercancel';
      const direction = cancelled ? null : committedDirection(allowed, offset.x, offset.y, width, height, (last.x - first.x) / dt, (last.y - first.y) / dt);
      armed = null;
      if (direction) {
        flyOut(direction).then((gone) => gone && onSwipe(direction));
      } else {
        settle();
      }
    };
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);
  }

  /**
   * Shows a new front card. It rises from the stack, or flies in from `enterFrom` (undo).
   * @param {object} card
   * @param {Node} card.content
   * @param {Direction[]} card.directions where it can be dragged
   * @param {Partial<Record<Direction, { text: string, tone: string }>>} [card.stamps] tone: yes, no, na, later
   * @param {boolean} [card.fill] filled with the area color, like the walk card
   * @param {number} [card.behind] cards behind it (0–2)
   * @param {Direction | null} [card.enterFrom]
   */
  function show({ content, directions, stamps: stampSpecs = {}, fill = false, behind: count = 2, enterFrom = null }) {
    front?.remove();
    allowed = directions;
    behind = Math.min(Math.max(count, 0), 2);
    leaving = false;
    offset = { x: 0, y: 0 };
    stamps = {};
    const stampElements = Object.entries(stampSpecs).map(([direction, { text, tone }]) => {
      const stamp = h('div', { class: `stamp ${STAMP_PLACES[direction].className} tone-${tone}`, 'aria-hidden': 'true' }, text);
      stamps[direction] = stamp;
      return stamp;
    });
    front = h('div', { class: `card card--front${fill ? ' card--fill' : ''}` }, h('div', { class: 'card__content' }, content), ...stampElements);
    attachGestures(front);
    element.append(front);
    render();

    const { width, height } = size();
    if (enterFrom) {
      const from = { right: [width * 1.4, 0], left: [-width * 1.4, 0], up: [0, -height * 1.2], down: [0, height * 1.2] }[enterFrom];
      front.animate([{ transform: `translate(${from[0]}px, ${from[1]}px)` }, { transform: 'translate(0, 0)' }], { duration: 480, easing: 'cubic-bezier(0.34, 1.3, 0.64, 1)' });
    } else {
      front.animate(
        [{ transform: `translateY(${STACK_STEP}px) scale(${1 - STACK_SCALE})` }, { transform: 'translateY(0) scale(1)' }],
        { duration: reducedMotion() ? 150 : 420, easing: 'cubic-bezier(0.34, 1.3, 0.64, 1)' },
      );
    }
    return front;
  }

  return {
    element,
    show,
    flyOut,
    /** Answers are ignored while saving one; the card can still be seen. */
    setEnabled(value) {
      enabled = value;
    },
  };
}
