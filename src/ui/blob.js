// An icon on a soft, slowly breathing blob of its area's color, with a lighter
// halo behind (IconBlob in Cleanerr 1.4). All blobs on screen move in one
// animation loop; with reduced motion they stand still (specification 9.5).

import { h, reducedMotion } from './dom.js';
import { icon } from './icons.js';

const TAU = Math.PI * 2;
const PERIOD_MS = 9000;

/** A smooth organic blob: a closed Catmull-Rom curve through points on a gently wobbling circle. */
export function blobPath(width, height, phase, wobble = 0.07, points = 8) {
  const cx = width / 2;
  const cy = height / 2;
  const base = Math.min(cx, cy) * (1 - wobble * 1.4);
  const pts = Array.from({ length: points }, (_, i) => {
    const a = (TAU * i) / points;
    const r = base * (1 + wobble * (0.6 * Math.sin(2 * a + phase) + 0.4 * Math.sin(3 * a - 1.3 * phase + 1)));
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
  const f = (n) => Math.round(n * 100) / 100;
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < points; i++) {
    const p0 = pts[(i - 1 + points) % points];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % points];
    const p3 = pts[(i + 2) % points];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d}Z`;
}

const live = new Set();
let frame = null;

function draw(blob, phase) {
  const p = phase + blob.seed;
  blob.halo.setAttribute('d', blobPath(100, 100, -p * 0.8 + 2, 0.09));
  blob.front.setAttribute('d', blobPath(90, 90, p));
}

function tick(time) {
  frame = null;
  const phase = ((time % PERIOD_MS) / PERIOD_MS) * TAU;
  for (const blob of live) {
    if (blob.element.isConnected) draw(blob, phase);
    else live.delete(blob);
  }
  if (live.size && !reducedMotion()) frame = requestAnimationFrame(tick);
}

/**
 * A blob with an icon. Its colors come from CSS: --blob (the blob) and --blob-icon (the icon), by default the
 * area's container and color. `size` is a CSS length; the icon is ~47% of it.
 */
export function iconBlob(iconName, { size = '8rem', seed = 0, animated = true, className = '' } = {}) {
  const halo = h('svg:path', { class: 'blob__halo' });
  const front = h('svg:path', { class: 'blob__front', transform: 'translate(5 5)' });
  const element = h(
    'div',
    { class: `blob ${className}`.trim(), style: { '--blob-size': size } },
    h('svg:svg', { class: 'blob__shape', viewBox: '0 0 100 100', 'aria-hidden': 'true' }, halo, front),
    icon(iconName, { className: 'blob__icon' }),
  );
  const blob = { element, halo, front, seed };
  draw(blob, 0);
  if (animated && !reducedMotion()) {
    live.add(blob);
    frame ??= requestAnimationFrame(tick);
  }
  return element;
}
