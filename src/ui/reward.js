// The reward (specification 5): a full-screen moment with confetti, waves,
// a jingle and a buzz, before the next question. Ported from Cleanerr 1.4.
// It has its own history entry, so Back works like "Next".

import { seededRandom } from '../core/random.js';
import { button, pill } from './components.js';
import { h, reducedMotion } from './dom.js';
import { icon } from './icons.js';
import { historyLayer } from './layer.js';
import { celebrate } from './sound.js';

const LIFE = 3.4;
const COLORS = ['#ffffff', '#ffd54f', '#ff8a65', '#81d4fa', '#ce93d8', '#a5f2c8', '#fff176'];

/** Pieces of confetti: a burst from the badge and a rain from above. */
function confetti(random) {
  const pick = () => COLORS[Math.floor(random.next() * COLORS.length)];
  const shape = (limits) => {
    const n = Math.floor(random.next() * 10);
    return n < limits[0] ? 0 : n < limits[1] ? 1 : 2;
  };
  const burst = Array.from({ length: 95 }, () => {
    const angle = random.next() * Math.PI * 2;
    const speed = 520 + random.next() * 1150;
    return {
      rain: false,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 380,
      delay: random.next() * 0.08,
      size: 7 + random.next() * 7,
      color: pick(),
      shape: shape([6, 8]),
      rotation: random.next() * 360,
      spin: (random.next() - 0.5) * 900,
      flutter: 6 + random.next() * 10,
      phase: random.next() * 6,
    };
  });
  const rain = Array.from({ length: 55 }, () => ({
    rain: true,
    vx: random.next(),
    vy: 20 + random.next() * 40,
    delay: 0.15 + random.next() * 1.3,
    size: 6 + random.next() * 6,
    color: pick(),
    shape: shape([5, 7]),
    rotation: random.next() * 360,
    spin: (random.next() - 0.5) * 500,
    flutter: 4 + random.next() * 7,
    phase: random.next() * 6,
  }));
  return [...burst, ...rain];
}

function drawWaves(ctx, center, time) {
  for (let i = 0; i <= 2; i++) {
    const t = time - 0.05 - i * 0.14;
    if (t < 0 || t > 0.95) continue;
    const k = t / 0.95;
    ctx.strokeStyle = `rgb(255 255 255 / ${0.5 * (1 - k)})`;
    ctx.lineWidth = 1 + 9 * (1 - k);
    ctx.beginPath();
    ctx.arc(center.x, center.y, 80 + k * 420, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function sparkle(ctx, s) {
  const r = s * 0.7;
  const w = r * 0.28;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(w, -w, r, 0);
  ctx.quadraticCurveTo(w, w, 0, r);
  ctx.quadraticCurveTo(-w, w, -r, 0);
  ctx.quadraticCurveTo(-w, -w, 0, -r);
  ctx.fill();
}

function drawConfetti(ctx, pieces, center, time, width, height) {
  const gravity = 980;
  for (const p of pieces) {
    const t = time - p.delay;
    if (t <= 0) continue;
    let x;
    let y;
    if (p.rain) {
      // Falls from above the screen with air drag and a gentle sway.
      const k = 1.5;
      y = -20 + (gravity / k) * (t - (1 - Math.exp(-k * t)) / k) + p.vy * t;
      x = p.vx * width + Math.sin(t * 2.4 + p.phase) * 22;
    } else {
      // Bursts out of the badge, slowed by air, pulled down by gravity.
      const k = 2.3;
      const e = Math.exp(-k * t);
      x = center.x + (p.vx * (1 - e)) / k;
      y = center.y + (gravity / k) * t + ((p.vy - gravity / k) * (1 - e)) / k;
    }
    const fade = Math.min(Math.max((LIFE - 0.25 - time) / 0.8, 0), 1);
    if (fade <= 0 || y > height + 40) continue;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.fillStyle = p.color;
    ctx.translate(x, y);
    ctx.rotate(((p.rotation + p.spin * t) * Math.PI) / 180);
    // Paper tumbles: its width breathes as it turns.
    ctx.scale(Math.cos(t * p.flutter + p.phase), 1);
    if (p.shape === 0) ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    else if (p.shape === 1) {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2.6, 0, Math.PI * 2);
      ctx.fill();
    } else sparkle(ctx, p.size);
    ctx.restore();
  }
}

/**
 * Shows a reward over everything.
 * @param {object} options
 * @param {string} options.title
 * @param {string | null} [options.subtitle]
 * @param {{ text: string, iconName?: string }[]} options.pills
 * @param {string} options.badge icon name
 * @param {'green' | 'lavender'} [options.palette] green for tasks, lavender for big cleans (13.1)
 * @param {string} options.nextLabel
 * @param {string | null} [options.enoughLabel] "That's enough for now", or none
 * @param {number} options.seed a different show every time
 * @param {boolean} options.sound sound and vibration on
 * @returns {Promise<'next' | 'enough'>}
 */
export function showReward({ title, subtitle = null, pills, badge, palette = 'green', nextLabel, enoughLabel = null, seed, sound }) {
  let resolve;
  const result = new Promise((r) => (resolve = r));
  let choice = 'next';

  const waves = h('canvas', { class: 'reward__canvas', 'aria-hidden': 'true' });
  const sparks = h('canvas', { class: 'reward__canvas reward__canvas--top', 'aria-hidden': 'true' });
  const badgeBox = h('div', { class: 'reward__badge' }, h('span', { class: 'reward__halo' }), h('span', { class: 'reward__disc' }, icon(badge, { className: 'reward__icon' })));
  const element = h(
    'div',
    { class: `reward reward--${palette}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    waves,
    h(
      'div',
      { class: 'reward__body' },
      h('div', { class: 'reward__space' }),
      badgeBox,
      h('h1', { class: 'reward__title t-display-s appear', style: { animationDelay: '120ms' } }, title),
      subtitle ? h('p', { class: 'reward__subtitle t-title-l appear', style: { animationDelay: '240ms' } }, subtitle) : null,
      h('div', { class: 'reward__pills appear', style: { animationDelay: '360ms' } }, pills.map((p) => pill(p.text, { iconName: p.iconName, tone: 'glass' }))),
      h('div', { class: 'reward__space reward__space--big' }),
      h(
        'div',
        { class: 'reward__actions appear', style: { animationDelay: '520ms' } },
        button(nextLabel, () => close('next'), { className: 'button--white' }),
        enoughLabel ? button(enoughLabel, () => close('enough'), { variant: 'text', className: 'button--on-color' }) : null,
      ),
    ),
    sparks,
  );

  const layer = historyLayer(() => {
    element.classList.add('reward--leaving');
    setTimeout(() => element.remove(), 300);
    resolve(choice);
  });
  function close(which) {
    choice = which;
    layer.close();
  }
  document.body.append(element);
  element.querySelector('.button')?.focus({ preventScroll: true });
  celebrate(sound);

  if (!reducedMotion()) {
    const pieces = confetti(seededRandom(seed));
    const ratio = window.devicePixelRatio || 1;
    const width = element.clientWidth;
    const height = element.clientHeight;
    for (const canvas of [waves, sparks]) {
      canvas.width = width * ratio;
      canvas.height = height * ratio;
    }
    const box = badgeBox.getBoundingClientRect();
    const center = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    const start = performance.now();
    const frame = (now) => {
      if (!element.isConnected) return;
      const time = (now - start) / 1000;
      for (const [canvas, draw] of [
        [waves, (ctx) => drawWaves(ctx, center, time)],
        [sparks, (ctx) => drawConfetti(ctx, pieces, center, time, width, height)],
      ]) {
        const ctx = canvas.getContext('2d');
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, width, height);
        draw(ctx);
      }
      if (time < LIFE && element.isConnected) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
  return result;
}
