// Icons (specification 7.4) from the sprite assets/icons/sprite.svg, made from
// design/icons/*.svg. The sprite is put into the page once; an icon is a small
// <svg><use></svg> that takes the color of the text around it.

import { SVG_NS, h } from './dom.js';

let loading = null;

/** Puts the sprite into the page. Call once before showing icons; later calls wait for the same load. */
export function loadIcons(url = new URL('../../assets/icons/sprite.svg', import.meta.url)) {
  loading ??= fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Icons: ${response.status}`);
      return response.text();
    })
    .then((text) => {
      const sprite = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
      sprite.setAttribute('aria-hidden', 'true');
      sprite.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
      document.body.prepend(document.importNode(sprite, true));
    });
  return loading;
}

/** An icon by name ('ui_check', 'area_kitchen'), sized by CSS (1.5rem by default) or by `size`. */
export function icon(name, { size = null, className = '' } = {}) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', `icon ${className}`.trim());
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  if (size) svg.style.setProperty('--icon-size', size);
  svg.append(h('svg:use', { href: `#${name}` }));
  return svg;
}
