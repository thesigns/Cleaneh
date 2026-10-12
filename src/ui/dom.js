// Small helpers for building the DOM (specification 13.1: own small components, no framework).

/**
 * Creates an element: `h('button', { class: 'answer', onclick: f, 'aria-label': 'Yes' }, child, 'text')`.
 * Props starting with `on` become listeners, `style` may be an object, `dataset` sets data-* attributes,
 * other props are attributes (false / null / undefined leave them out). Children may be nodes, strings,
 * numbers, arrays, or null (skipped).
 */
export function h(tag, props = {}, ...children) {
  const element = tag.startsWith('svg:') ? document.createElementNS(SVG_NS, tag.slice(4)) : document.createElement(tag);
  for (const [name, value] of Object.entries(props ?? {})) {
    if (value === false || value === null || value === undefined) continue;
    if (name.startsWith('on') && typeof value === 'function') element.addEventListener(name.slice(2), value);
    else if (name === 'style' && typeof value === 'object') {
      for (const [property, v] of Object.entries(value)) {
        if (property.startsWith('--')) element.style.setProperty(property, v);
        else element.style[property] = v;
      }
    }
    else if (name === 'dataset') Object.assign(element.dataset, value);
    else element.setAttribute(name, value === true ? '' : String(value));
  }
  append(element, children);
  return element;
}

export const SVG_NS = 'http://www.w3.org/2000/svg';

/** Appends children like h() does. */
export function append(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    parent.append(child instanceof Node ? child : String(child));
  }
  return parent;
}

/** Replaces all children. */
export function replaceChildren(parent, ...children) {
  parent.replaceChildren();
  return append(parent, children);
}

/** Whether the user asked for less motion (continuous animations off, short transitions stay, 9.5). */
export function reducedMotion() {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
